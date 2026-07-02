import prisma from "./prisma";
import fs from "fs";
import path from "path";

// Deterministic coordinates for mock auto-assignment
export function getPincodeCoords(pincode: string): { lat: number; lng: number } {
  const cleanPin = pincode.trim().replace(/\D/g, "");
  const mapping: Record<string, { lat: number; lng: number }> = {
    "110001": { lat: 28.6139, lng: 77.2090 },
    "110002": { lat: 28.6250, lng: 77.2180 },
    "110003": { lat: 28.6300, lng: 77.2250 },
    "110004": { lat: 28.6350, lng: 77.2300 },
    "400001": { lat: 18.9220, lng: 72.8347 },
    "400002": { lat: 18.9350, lng: 72.8450 },
    "400003": { lat: 18.9450, lng: 72.8550 },
    "400004": { lat: 18.9550, lng: 72.8650 },
    "560001": { lat: 12.9716, lng: 77.5946 },
    "560002": { lat: 12.9850, lng: 77.6050 },
    "560003": { lat: 12.9950, lng: 77.6150 },
    "560004": { lat: 13.0050, lng: 77.6250 },
  };
  
  if (mapping[cleanPin]) return mapping[cleanPin];
  
  // Deterministic fallback generator
  const num = parseInt(cleanPin, 10) || 110001;
  const lat = 20.0 + (num % 1000) / 100;
  const lng = 75.0 + (num % 500) / 50;
  return { lat, lng };
}

// Haversine distance in km
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Zone Detection helper
export async function detectZoneByPincode(pincode: string) {
  const cleanPin = pincode.trim().replace(/\D/g, "");
  const zones = await prisma.zone.findMany({});
  for (const zone of zones) {
    const list = zone.pincodes.split(",").map((p) => p.trim());
    if (list.includes(cleanPin)) {
      return zone;
    }
  }
  return null;
}

// Pricing calculation engine
export async function calculateDeliveryCharges(params: {
  length: number;
  width: number;
  height: number;
  actualWeight: number;
  orderType: string; // "B2B" or "B2C"
  paymentType: string; // "PREPAID" or "COD"
  pickupPincode: string;
  dropPincode: string;
}) {
  const { length, width, height, actualWeight, orderType, paymentType, pickupPincode, dropPincode } = params;

  // Calculate volumetric weight
  const volumetricWeight = (length * width * height) / 5000;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  // Detect Zones
  const pickupZone = await detectZoneByPincode(pickupPincode);
  const dropZone = await detectZoneByPincode(dropPincode);

  if (!pickupZone || !dropZone) {
    throw new Error("Pickup or Drop pincode does not map to any configured Zone. Admin must configure them first.");
  }

  // Intra-zone if same zone, else Inter-zone
  const isIntraZone = pickupZone.id === dropZone.id;

  // Lookup rate card
  const rateCard = await prisma.rateCard.findFirst({
    where: { orderType },
  });

  if (!rateCard) {
    throw new Error(`Rate card for order type ${orderType} not configured.`);
  }

  const ratePerKg = isIntraZone ? rateCard.intraZoneRatePerKg : rateCard.interZoneRatePerKg;
  const baseCharge = chargeableWeight * ratePerKg;

  // COD surcharge calculation
  const codSurcharge = paymentType === "COD" ? rateCard.codSurcharge : 0;

  const totalCharge = baseCharge + codSurcharge;

  return {
    volumetricWeight,
    chargeableWeight,
    pickupZoneId: pickupZone.id,
    pickupZoneName: pickupZone.name,
    dropZoneId: dropZone.id,
    dropZoneName: dropZone.name,
    isIntraZone,
    baseCharge,
    codSurcharge,
    totalCharge,
    rateCardId: rateCard.id,
  };
}

// Simulated notification system logs events to file
export interface SimulatedNotification {
  id: string;
  orderNumber: string;
  orderId: string;
  type: "EMAIL" | "SMS";
  recipient: string;
  subject?: string;
  message: string;
  timestamp: string;
}

export function logNotification(notification: Omit<SimulatedNotification, "id" | "timestamp">) {
  const logFile = path.join(process.cwd(), "notifications.json");
  let notifications: SimulatedNotification[] = [];
  
  try {
    if (fs.existsSync(logFile)) {
      notifications = JSON.parse(fs.readFileSync(logFile, "utf-8"));
    }
  } catch (err) {
    console.error("Error reading notifications file", err);
  }

  const newLog: SimulatedNotification = {
    ...notification,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
  };

  notifications.unshift(newLog); // Newest first

  // Keep last 100 logs
  if (notifications.length > 100) {
    notifications = notifications.slice(0, 100);
  }

  try {
    fs.writeFileSync(logFile, JSON.stringify(notifications, null, 2));
    console.log(`[Simulated Notification - ${newLog.type}] to ${newLog.recipient}: ${newLog.message}`);
  } catch (err) {
    console.error("Error writing notifications file", err);
  }
}

// Intelligent agent auto-assignment
export async function autoAssignOrderAgent(orderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { pickupZone: true },
  });

  if (!order) {
    console.error(`Order ${orderId} not found for auto-assignment.`);
    return false;
  }

  // Find all available agents
  const availableAgents = await prisma.agentProfile.findMany({
    where: { status: "AVAILABLE" },
    include: { user: true },
  });

  if (availableAgents.length === 0) {
    console.log(`No available agents for order ${order.orderNumber}. Order remains in PENDING.`);
    return false;
  }

  const orderCoords = getPincodeCoords(order.pickupPincode);
  let bestAgent = null;
  let minDistance = Infinity;

  // Attempt 1: Filter agents in same zone
  const agentsInZone = availableAgents.filter(
    (agent) => agent.currentZone === order.pickupZone?.name
  );

  const candidateAgents = agentsInZone.length > 0 ? agentsInZone : availableAgents;

  // Find the closest agent using Haversine formula
  for (const agent of candidateAgents) {
    const dist = calculateDistance(
      orderCoords.lat,
      orderCoords.lng,
      agent.latitude,
      agent.longitude
    );
    
    if (dist < minDistance) {
      minDistance = dist;
      bestAgent = agent;
    }
  }

  if (bestAgent) {
    // Transaction to update Order status/agent and Agent status
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          agentId: bestAgent.user.id,
          status: "ASSIGNED",
        },
      }),
      prisma.agentProfile.update({
        where: { id: bestAgent.id },
        data: { status: "BUSY" },
      }),
      // Log immutable tracking history
      prisma.orderTrackingHistory.create({
        data: {
          orderId: orderId,
          status: "ASSIGNED",
          actorId: bestAgent.user.id, // System or the assigned agent
          remarks: `Auto-assigned to agent ${bestAgent.user.name} (${minDistance.toFixed(2)} km away).`,
        },
      }),
    ]);

    // Send notifications
    const customer = await prisma.user.findUnique({ where: { id: order.customerId } });
    if (customer) {
      logNotification({
        orderNumber: order.orderNumber,
        orderId: order.id,
        type: "EMAIL",
        recipient: customer.email,
        subject: `Delivery Agent Assigned - Order ${order.orderNumber}`,
        message: `Hello ${customer.name}, your delivery agent ${bestAgent.user.name} has been assigned to your order. Delivery distance is approx. ${minDistance.toFixed(2)} km.`,
      });
      logNotification({
        orderNumber: order.orderNumber,
        orderId: order.id,
        type: "SMS",
        recipient: "Customer Mobile",
        message: `Order ${order.orderNumber}: Delivery agent ${bestAgent.user.name} is assigned to your pickup.`,
      });
    }

    return true;
  }

  return false;
}
