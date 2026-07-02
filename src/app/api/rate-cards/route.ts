export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUserFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const rateCards = await prisma.rateCard.findMany({});
    return NextResponse.json({ rateCards });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, intraZoneRatePerKg, interZoneRatePerKg, codSurcharge } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Rate card ID is required" }, { status: 400 });
    }

    const updatedCard = await prisma.rateCard.update({
      where: { id },
      data: {
        intraZoneRatePerKg: parseFloat(intraZoneRatePerKg),
        interZoneRatePerKg: parseFloat(interZoneRatePerKg),
        codSurcharge: parseFloat(codSurcharge),
      },
    });

    return NextResponse.json({ rateCard: updatedCard });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

