export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromCookies();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const agents = await prisma.agentProfile.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status, currentZone, latitude, longitude } = await request.json();

    // Check if the agent wants to update their own profile, or if it's admin updating
    const agentProfile = await prisma.agentProfile.findUnique({
      where: { userId: user.id },
    });

    if (!agentProfile && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Agent profile not found" }, { status: 404 });
    }

    const targetUserId = agentProfile ? user.id : null;

    if (!targetUserId) {
      return NextResponse.json({ error: "Operation not permitted" }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (currentZone !== undefined) updateData.currentZone = currentZone;
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

    const updatedProfile = await prisma.agentProfile.update({
      where: { userId: targetUserId },
      data: updateData,
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

