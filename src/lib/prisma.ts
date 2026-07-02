import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

let prisma: PrismaClient;

const getPrismaClient = () => {
  // Read database URL from environment or fallback to default SQLite path
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  
  // Set up SQLite adapter for Prisma 7
  const adapter = new PrismaBetterSqlite3({
    url: databaseUrl,
  });
  
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
