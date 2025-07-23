const { PrismaClient } = require('@prisma/client');

// Test content prisma
const contentPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://cloud-shop:testpassword@localhost:5432/cloud_shop?schema=content'
    }
  }
});

console.log('Content Prisma models:');
console.log(Object.keys(contentPrisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));

// Try to access topPageDisplay
console.log('\nChecking topPageDisplay model:');
console.log('topPageDisplay exists?', !!contentPrisma.topPageDisplay);

// Test analytics prisma
const analyticsPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://cloud-shop:testpassword@localhost:5432/cloud_shop?schema=analytics'
    }
  }
});

console.log('\nAnalytics Prisma models:');
console.log(Object.keys(analyticsPrisma).filter(k => !k.startsWith('$') && !k.startsWith('_')));

Promise.all([
  contentPrisma.$disconnect(),
  analyticsPrisma.$disconnect()
]).then(() => process.exit(0));