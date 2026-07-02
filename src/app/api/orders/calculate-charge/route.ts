export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { calculateDeliveryCharges } from "@/lib/logistics";
import { getUserFromCookies } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { length, width, height, actualWeight, orderType, paymentType, pickupPincode, dropPincode } = body;

    // Validate parameters
    if (
      length === undefined ||
      width === undefined ||
      height === undefined ||
      actualWeight === undefined ||
      !orderType ||
      !paymentType ||
      !pickupPincode ||
      !dropPincode
    ) {
      return NextResponse.json({ error: "Missing required pricing dimensions or address info" }, { status: 400 });
    }

    const chargeInfo = await calculateDeliveryCharges({
      length: parseFloat(length),
      width: parseFloat(width),
      height: parseFloat(height),
      actualWeight: parseFloat(actualWeight),
      orderType,
      paymentType,
      pickupPincode,
      dropPincode,
    });

    return NextResponse.json(chargeInfo);
  } catch (error: any) {
    console.error("Calculate charge error:", error);
    return NextResponse.json({ error: error.message || "Pricing calculation failed" }, { status: 400 });
  }
}

