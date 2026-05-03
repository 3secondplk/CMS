import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Disable query logging in production for performance
    log: process.env.NODE_ENV === 'production' ? [] : ['query'],
    // VER-02: Connection pooling for serverless (Vercel + Neon)
    // These are safe defaults for both SQLite (local) and PostgreSQL (Neon)
    datasources: process.env.DATABASE_URL?.includes('postgresql') || process.env.DATABASE_URL?.includes('neon')
      ? { db: { url: process.env.DATABASE_URL } }
      : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
