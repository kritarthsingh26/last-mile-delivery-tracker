require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set. Cannot run seed.");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean old data
  await prisma.orderTrackingHistory.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.agentProfile.deleteMany({});
  await prisma.rateCard.deleteMany({});
  await prisma.zone.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Cleaned old tables.");

  // Password hashes
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const customerPasswordHash = await bcrypt.hash("customer123", 10);
  const agentPasswordHash = await bcrypt.hash("agent123", 10);

  // Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@lastmile.com",
      passwordHash: adminPasswordHash,
      name: "Operations Admin",
      role: "ADMIN",
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: "customer@lastmile.com",
      passwordHash: customerPasswordHash,
      name: "Jane Doe",
      role: "CUSTOMER",
    },
  });

  const customerB2B = await prisma.user.create({
    data: {
      email: "b2b_customer@lastmile.com",
      passwordHash: customerPasswordHash,
      name: "Acme Corp B2B",
      role: "CUSTOMER",
    },
  });

  const customerB2C = await prisma.user.create({
    data: {
      email: "b2c_customer@lastmile.com",
      passwordHash: customerPasswordHash,
      name: "John Smith B2C",
      role: "CUSTOMER",
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      email: "agent1@lastmile.com",
      passwordHash: agentPasswordHash,
      name: "Agent Delhi (Zone A)",
      role: "AGENT",
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      email: "agent2@lastmile.com",
      passwordHash: agentPasswordHash,
      name: "Agent Mumbai (Zone B)",
      role: "AGENT",
    },
  });

  const agent3 = await prisma.user.create({
    data: {
      email: "agent3@lastmile.com",
      passwordHash: agentPasswordHash,
      name: "Agent Bangalore (Zone C)",
      role: "AGENT",
    },
  });

  console.log("Created users.");

  // Zones
  const zoneA = await prisma.zone.create({
    data: {
      name: "Zone A",
      pincodes: "110001,110002,110003,110004", // Delhi Area
    },
  });

  const zoneB = await prisma.zone.create({
    data: {
      name: "Zone B",
      pincodes: "400001,400002,400003,400004", // Mumbai Area
    },
  });

  const zoneC = await prisma.zone.create({
    data: {
      name: "Zone C",
      pincodes: "560001,560002,560003,560004", // Bangalore Area
    },
  });

  console.log("Created zones.");

  // Agent Profiles
  // Coordinates match the center points of Delhi, Mumbai, and Bangalore
  await prisma.agentProfile.create({
    data: {
      userId: agent1.id,
      status: "AVAILABLE",
      currentZone: "Zone A",
      latitude: 28.6139,
      longitude: 77.2090,
    },
  });

  await prisma.agentProfile.create({
    data: {
      userId: agent2.id,
      status: "AVAILABLE",
      currentZone: "Zone B",
      latitude: 18.9220,
      longitude: 72.8347,
    },
  });

  await prisma.agentProfile.create({
    data: {
      userId: agent3.id,
      status: "AVAILABLE",
      currentZone: "Zone C",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });

  console.log("Created agent profiles.");

  // Rate Cards
  await prisma.rateCard.create({
    data: {
      orderType: "B2B",
      intraZoneRatePerKg: 40.0,
      interZoneRatePerKg: 100.0,
      codSurcharge: 80.0,
    },
  });

  await prisma.rateCard.create({
    data: {
      orderType: "B2C",
      intraZoneRatePerKg: 60.0,
      interZoneRatePerKg: 150.0,
      codSurcharge: 40.0,
    },
  });

  console.log("Created rate cards.");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
