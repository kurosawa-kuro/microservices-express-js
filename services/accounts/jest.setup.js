const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { execSync } = require('child_process');

process.env.DATABASE_URL = `file:${path.join(__dirname, 'test.db')}`;
process.env.NODE_ENV = 'test';

let prisma;

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `file:${path.join(__dirname, 'test.db')}` }
    });
  } catch (error) {
    execSync('npx prisma db push', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `file:${path.join(__dirname, 'test.db')}` }
    });
  }
  
  prisma = new PrismaClient();
  
  try {
    await prisma.$executeRaw`DELETE FROM accounts`;
    await prisma.$executeRaw`DELETE FROM customer`;
  } catch (error) {
  }
});

afterAll(async () => {
  try {
    await prisma.$executeRaw`DELETE FROM accounts`;
    await prisma.$executeRaw`DELETE FROM customer`;
  } catch (error) {
  }
  
  await prisma.$disconnect();
});

beforeEach(async () => {
  try {
    await prisma.$executeRaw`DELETE FROM accounts`;
    await prisma.$executeRaw`DELETE FROM customer`;
  } catch (error) {
  }
});

global.prisma = prisma;
