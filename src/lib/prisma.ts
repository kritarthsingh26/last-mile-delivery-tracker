import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let prisma: PrismaClient;

const getPrismaClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  
  // Setup Postgres pool and driver adapter for Prisma 7
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({ adapter });
};

// Use global variable to maintain client instance across hot-reloading in dev
if (process.env.NODE_ENV === "production") {
  prisma = getPrismaClient();
} else {
  if (!(global as any).prisma) {
    (global as any).prisma = getPrismaClient();
  }
  prisma = (global as any).prisma;
}

export default prisma;
