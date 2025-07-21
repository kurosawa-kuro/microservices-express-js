import { PrismaClient } from '@prisma/client';

let prisma;

export function getDatabaseClient() {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function closeDatabaseConnection() {
  if (prisma) {
    await prisma.$disconnect();
  }
}