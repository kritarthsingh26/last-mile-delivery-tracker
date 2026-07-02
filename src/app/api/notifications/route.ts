export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getUserFromCookies } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const logFile = path.join(process.cwd(), "notifications.json");
    let notifications = [];

    if (fs.existsSync(logFile)) {
      try {
        notifications = JSON.parse(fs.readFileSync(logFile, "utf-8"));
      } catch (err) {
        console.error("Error parsing notifications log file", err);
      }
    }

    // Filters: if the user is a CUSTOMER, return only notifications destined for their email
    // If ADMIN, return all
    // If AGENT, return all or those relating to their assignments (let's keep all or filter for simplicity)
    if (user.role === "CUSTOMER") {
      notifications = notifications.filter(
        (n: any) => n.recipient === user.email || n.recipient === "Customer Mobile"
      );
    }

    return NextResponse.json({ notifications });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

