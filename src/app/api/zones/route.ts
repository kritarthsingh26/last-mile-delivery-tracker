export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const zones = await prisma.zone.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ zones });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, pincodes } = await request.json();

    if (!name || !pincodes) {
      return NextResponse.json({ error: "Zone name and pincodes are required" }, { status: 400 });
    }

    // Clean comma separated string
    const cleanPincodes = pincodes
      .split(",")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 0)
      .join(",");

    const newZone = await prisma.zone.create({
      data: {
        name,
        pincodes: cleanPincodes,
      },
    });

    return NextResponse.json({ zone: newZone });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

