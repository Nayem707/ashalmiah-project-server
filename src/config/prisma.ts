import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Reuse a single PrismaClient instance across hot reloads in development.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isProduction ? ['error'] : ['query', 'warn', 'error'],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
