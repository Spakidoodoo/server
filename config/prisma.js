import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export { prisma };
// lankebakare
// kE4Kc5unV9JLTrrn