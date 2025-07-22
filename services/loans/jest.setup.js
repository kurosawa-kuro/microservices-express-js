const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { execSync } = require('child_process');

process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER || 'cloud-shop'}:${process.env.POSTGRES_PASSWORD || 'cloud-shop123'}@localhost:5432/cloud-shop_loans_test`;
process.env.NODE_ENV = 'test';

let prisma;

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `postgresql://${process.env.POSTGRES_USER || 'cloud-shop'}:${process.env.POSTGRES_PASSWORD || 'cloud-shop123'}@localhost:5432/cloud-shop_loans_test` }
    });
  } catch (error) {
    execSync('npx prisma db push', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `postgresql://${process.env.POSTGRES_USER || 'cloud-shop'}:${process.env.POSTGRES_PASSWORD || 'cloud-shop123'}@localhost:5432/cloud-shop_loans_test` }
    });
  }
  
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
