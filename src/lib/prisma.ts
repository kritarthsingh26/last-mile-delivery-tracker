import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

let prisma: PrismaClient;

const getPrismaClient = () => {
  // Read database URL from environment or fallback to default SQLite path
  let databaseUrl = process.env.DATABASE_URL || "file:./dev.db";
  
  if (databaseUrl.startsWith("file:")) {
    const relativePath = databaseUrl.replace("file:", "");
    // Resolve relative to project root (process.cwd())
    const absolutePath = path.resolve(process.cwd(), relativePath);
    databaseUrl = `file:${absolutePath}`;
  }
  
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
