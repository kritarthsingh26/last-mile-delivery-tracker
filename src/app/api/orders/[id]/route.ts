export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";
import { autoAssignOrderAgent, logNotification } from "@/lib/logistics";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        pickupZone: true,
        dropZone: true,
        customer: { select: { name: true, email: true } },
        trackingHistory: {
          orderBy: { timestamp: "desc" },
          include: { actor: { select: { name: true, role: true } } },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Role checks
    if (user.role === "CUSTOMER" && order.customerId !== user.id) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }
    if (user.role === "AGENT" && order.agentId !== user.id) {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, remarks, scheduledDate, agentId, triggerAutoAssign } = body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // --- CASE 1: RESCHEDULING BY CUSTOMER ---
    if (status === "RESCHEDULED" && user.role === "CUSTOMER") {
      if (order.customerId !== user.id) {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
      }
      if (order.status !== "FAILED") {
        return NextResponse.json({ error: "Only failed orders can be rescheduled" }, { status: 400 });
      }
      if (!scheduledDate) {
        return NextResponse.json({ error: "New scheduled date is required" }, { status: 400 });
      }

      const prevAgentId = order.agentId;

      await prisma.$transaction(async (tx) => {
        // Update Order
        await tx.order.update({
          where: { id },
          data: {
            status: "RESCHEDULED",
            scheduledDate: new Date(scheduledDate),
            agentId: null, // Unassign previous agent
          },
        });

        // Set previous agent back to AVAILABLE
        if (prevAgentId) {
          const agentProfile = await tx.agentProfile.findUnique({ where: { userId: prevAgentId } });
          if (agentProfile) {
            await tx.agentProfile.update({
              where: { id: agentProfile.id },
              data: { status: "AVAILABLE" },
            });
          }
        }

        // Add to tracking history
        await tx.orderTrackingHistory.create({
          data: {
            orderId: id,
            status: "RESCHEDULED",
            actorId: user.id,
            remarks: `Rescheduled for ${new Date(scheduledDate).toLocaleDateString()}. Reason: ${remarks || "None"}. Agent unassigned.`,
          },
        });
      });

      // Log notification
      logNotification({
        orderNumber: order.orderNumber,
        orderId: order.id,
        type: "EMAIL",
        recipient: order.customer.email,
        subject: `Order Rescheduled - ${order.orderNumber}`,
        message: `Hello ${order.customer.name}, your order ${order.orderNumber} has been rescheduled to ${new Date(scheduledDate).toLocaleDateString()}. Reassigning new agent...`,
      });

      // Trigger auto-assignment for the rescheduled order
      await autoAssignOrderAgent(id);

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
      });

      return NextResponse.json({ order: updatedOrder });
    }

    // --- CASE 2: MANUAL ASSIGNMENT BY ADMIN ---
    if (agentId !== undefined && user.role === "ADMIN") {
      const prevAgentId = order.agentId;

      if (agentId === null) {
        // Unassigning agent
        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id },
            data: { agentId: null, status: "PENDING" },
          });

          if (prevAgentId) {
            const profile = await tx.agentProfile.findUnique({ where: { userId: prevAgentId } });
            if (profile) {
              await tx.agentProfile.update({
                where: { id: profile.id },
                data: { status: "AVAILABLE" },
              });
            }
          }

          await tx.orderTrackingHistory.create({
            data: {
              orderId: id,
              status: "PENDING",
              actorId: user.id,
              remarks: "Agent manually unassigned by administrator.",
            },
          });
        });
      } else {
        // Assign new agent
        const targetAgent = await prisma.agentProfile.findUnique({
          where: { userId: agentId },
          include: { user: true },
        });

        if (!targetAgent) {
          return NextResponse.json({ error: "Agent not found" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id },
            data: {
              agentId,
              status: "ASSIGNED",
            },
          });

          // Set new agent to BUSY
          await tx.agentProfile.update({
            where: { id: targetAgent.id },
            data: { status: "BUSY" },
          });

          // Set old agent back to AVAILABLE
          if (prevAgentId && prevAgentId !== agentId) {
            const prevProfile = await tx.agentProfile.findUnique({ where: { userId: prevAgentId } });
            if (prevProfile) {
              await tx.agentProfile.update({
                where: { id: prevProfile.id },
                data: { status: "AVAILABLE" },
              });
            }
          }

          await tx.orderTrackingHistory.create({
            data: {
              orderId: id,
              status: "ASSIGNED",
              actorId: user.id,
              remarks: `Manually assigned to agent ${targetAgent.user.name} by Admin.`,
            },
          });
        });

        logNotification({
          orderNumber: order.orderNumber,
          orderId: order.id,
          type: "EMAIL",
          recipient: order.customer.email,
          subject: `Agent Assigned - ${order.orderNumber}`,
          message: `Hello ${order.customer.name}, delivery agent ${targetAgent.user.name} has been manually assigned to your order by the administrator.`,
        });
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
      });

      return NextResponse.json({ order: updatedOrder });
    }

    // --- CASE 3: ADMIN TRIGGER AUTO-ASSIGN ---
    if (triggerAutoAssign && user.role === "ADMIN") {
      const assigned = await autoAssignOrderAgent(id);
      if (!assigned) {
        return NextResponse.json({ error: "No available agent found to assign" }, { status: 400 });
      }

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
      });

      return NextResponse.json({ order: updatedOrder });
    }

    // --- CASE 4: STATUS LIFECYCLE UPDATE (AGENT OR ADMIN OVERRIDE) ---
    if (status) {
      // Permission checks
      if (user.role === "AGENT" && order.agentId !== user.id) {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
      }
      if (user.role !== "ADMIN" && user.role !== "AGENT") {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
      }

      const prevStatus = order.status;
      const agentIdForUpdate = order.agentId;

      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id },
          data: { status },
        });

        // Agent status updates based on delivery outcomes
        if (agentIdForUpdate) {
          const agentProfile = await tx.agentProfile.findUnique({ where: { userId: agentIdForUpdate } });
          if (agentProfile) {
            if (status === "DELIVERED" || status === "FAILED") {
              // Agent is now free
              await tx.agentProfile.update({
                where: { id: agentProfile.id },
                data: { status: "AVAILABLE" },
              });
            } else {
              // Keep busy
              await tx.agentProfile.update({
                where: { id: agentProfile.id },
                data: { status: "BUSY" },
              });
            }
          }
        }

        await tx.orderTrackingHistory.create({
          data: {
            orderId: id,
            status,
            actorId: user.id,
            remarks: remarks || `Order status updated from ${prevStatus} to ${status}.`,
          },
        });
      });

      // Send status update notifications
      logNotification({
        orderNumber: order.orderNumber,
        orderId: order.id,
        type: "EMAIL",
        recipient: order.customer.email,
        subject: `Order Status Update: ${status}`,
        message: `Hello ${order.customer.name}, the status of your order ${order.orderNumber} has changed from ${prevStatus} to ${status}. Remarks: ${remarks || "None"}.`,
      });

      logNotification({
        orderNumber: order.orderNumber,
        orderId: order.id,
        type: "SMS",
        recipient: "Customer Mobile",
        message: `Order ${order.orderNumber} updated to ${status}: ${remarks || "No comments"}.`,
      });

      const updatedOrder = await prisma.order.findUnique({
        where: { id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
      });

      return NextResponse.json({ order: updatedOrder });
    }

    return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
  } catch (error: any) {
    console.error("Order PUT API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
