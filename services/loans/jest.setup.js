const { PrismaClient } = require('@prisma/client');
const path = require('path');

process.env.DATABASE_URL = `file:${path.join(__dirname, 'test.db')}`;
process.env.NODE_ENV = 'test';

let prisma;

beforeAll(async () => {
  prisma = new PrismaClient();
  
  try {
    await prisma.$executeRaw`DELETE FROM loans`;
  } catch (error) {
  }
});

afterAll(async () => {
  try {
    await prisma.$executeRaw`DELETE FROM loans`;
  } catch (error) {
  }
  
  await prisma.$disconnect();
});

beforeEach(async () => {
  try {
    await prisma.$executeRaw`DELETE FROM loans`;
  } catch (error) {
  }
});

global.prisma = prisma;
