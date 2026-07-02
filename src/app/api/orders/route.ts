export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";
import { calculateDeliveryCharges, autoAssignOrderAgent, logNotification } from "@/lib/logistics";

export async function GET(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const zoneId = searchParams.get("zoneId");
    const agentIdParam = searchParams.get("agentId");

    let orders;

    if (user.role === "CUSTOMER") {
      orders = await prisma.order.findMany({
        where: { customerId: user.id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "AGENT") {
      orders = await prisma.order.findMany({
        where: { agentId: user.id },
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    } else if (user.role === "ADMIN") {
      const whereClause: any = {};
      if (status) whereClause.status = status;
      if (zoneId) {
        whereClause.OR = [
          { pickupZoneId: zoneId },
          { dropZoneId: zoneId }
        ];
      }
      if (agentIdParam) whereClause.agentId = agentIdParam;

      orders = await prisma.order.findMany({
        where: whereClause,
        include: {
          pickupZone: true,
          dropZone: true,
          customer: { select: { name: true, email: true } },
          trackingHistory: { orderBy: { timestamp: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Fetch orders API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      pickupAddress,
      pickupPincode,
      dropAddress,
      dropPincode,
      length,
      width,
      height,
      actualWeight,
      orderType,
      paymentType,
      customerId, // Only admin can pass this
    } = body;

    // Validate inputs
    if (
      !pickupAddress ||
      !pickupPincode ||
      !dropAddress ||
      !dropPincode ||
      length === undefined ||
      width === undefined ||
      height === undefined ||
      actualWeight === undefined ||
      !orderType ||
      !paymentType
    ) {
      return NextResponse.json({ error: "Missing required order information fields" }, { status: 400 });
    }

    // Determine target customer
    let targetCustomerId = user.id;
    if (user.role === "ADMIN" && customerId) {
      targetCustomerId = customerId;
    }

    // Double check that the target customer exists
    const customer = await prisma.user.findUnique({
      where: { id: targetCustomerId },
    });
    if (!customer) {
      return NextResponse.json({ error: "Target customer not found" }, { status: 404 });
    }

    // Run dynamic rate calculation
    const pricing = await calculateDeliveryCharges({
      length: parseFloat(length),
      width: parseFloat(width),
      height: parseFloat(height),
      actualWeight: parseFloat(actualWeight),
      orderType,
      paymentType,
      pickupPincode,
      dropPincode,
    });

    const orderNumber = `LMD-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Create the order and log history inside a transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: targetCustomerId,
          pickupAddress,
          pickupPincode,
          pickupZoneId: pricing.pickupZoneId,
          dropAddress,
          dropPincode,
          dropZoneId: pricing.dropZoneId,
          length: parseFloat(length),
          width: parseFloat(width),
          height: parseFloat(height),
          actualWeight: parseFloat(actualWeight),
          volumetricWeight: pricing.volumetricWeight,
          chargeableWeight: pricing.chargeableWeight,
          orderType,
          paymentType,
          baseCharge: pricing.baseCharge,
          codSurcharge: pricing.codSurcharge,
          totalCharge: pricing.totalCharge,
          status: "PENDING",
        },
      });

      await tx.orderTrackingHistory.create({
        data: {
          orderId: order.id,
          status: "PENDING",
          actorId: user.id,
          remarks: user.role === "ADMIN" ? `Placed by Admin on behalf of ${customer.name}.` : "Order created by customer.",
        },
      });

      return order;
    });

    // Notify customer about order placement
    logNotification({
      orderNumber: newOrder.orderNumber,
      orderId: newOrder.id,
      type: "EMAIL",
      recipient: customer.email,
      subject: `Order Confirmed - ${newOrder.orderNumber}`,
      message: `Hello ${customer.name}, your order ${newOrder.orderNumber} has been received. Autocalculated charge is Rs. ${newOrder.totalCharge.toFixed(2)}. Status is PENDING.`,
    });

    // Trigger auto-assignment of delivery agent
    await autoAssignOrderAgent(newOrder.id);

    // Fetch the updated order with agent info
    const finalOrder = await prisma.order.findUnique({
      where: { id: newOrder.id },
      include: {
        pickupZone: true,
        dropZone: true,
        customer: { select: { name: true, email: true } },
        trackingHistory: { orderBy: { timestamp: "desc" } },
      },
    });

    return NextResponse.json({ order: finalOrder });
  } catch (error: any) {
    console.error("Create order API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 400 });
  }
}

