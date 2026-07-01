import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? ['error']
        : ['error', 'warn'],
  });

// In development, Prisma prints to stdout; in production only errors go through.
// Fatal DB errors are surfaced via the health-check endpoint and Winston at the call site.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { logger };
