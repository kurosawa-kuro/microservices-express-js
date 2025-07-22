const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { execSync } = require('child_process');

process.env.DATABASE_URL = `postgresql://${process.env.POSTGRES_USER || 'kurobank'}:${process.env.POSTGRES_PASSWORD || 'kurobank123'}@localhost:5432/kurobank_accounts_test`;
process.env.NODE_ENV = 'test';

let prisma;

beforeAll(async () => {
  try {
    execSync('npx prisma migrate deploy', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `postgresql://${process.env.POSTGRES_USER || 'kurobank'}:${process.env.POSTGRES_PASSWORD || 'kurobank123'}@localhost:5432/kurobank_accounts_test` }
    });
  } catch (error) {
    execSync('npx prisma db push', { 
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: `postgresql://${process.env.POSTGRES_USER || 'kurobank'}:${process.env.POSTGRES_PASSWORD || 'kurobank123'}@localhost:5432/kurobank_accounts_test` }
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
