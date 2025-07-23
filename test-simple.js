const express = require('express');
const { PrismaClient } = require('@prisma/client');

// Test Analytics Service
const analyticsApp = express();
analyticsApp.use(express.json());

const analyticsPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://cloud-shop:testpassword@localhost:5432/cloud_shop?schema=analytics'
    }
  }
});

analyticsApp.post('/test/view-history', async (req, res) => {
  try {
    const viewHistory = await analyticsPrisma.viewHistory.create({
      data: {
        userId: req.body.userId || 'test123',
        productId: req.body.productId || 1,
        productName: req.body.productName || 'Test Product',
        productPrice: req.body.productPrice || 99.99,
        categoryId: req.body.categoryId || 1,
        categoryName: req.body.categoryName || 'Electronics'
      }
    });
    res.json(viewHistory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test Content Service
const contentApp = express();
contentApp.use(express.json());

const contentPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://cloud-shop:testpassword@localhost:5432/cloud_shop?schema=content'
    }
  }
});

contentApp.post('/test/display', async (req, res) => {
  try {
    const display = await contentPrisma.topPageDisplay.create({
      data: {
        displayType: req.body.displayType || 'RECOMMENDED',
        productId: req.body.productId || 1,
        productName: req.body.productName || 'Test Product',
        productPrice: req.body.productPrice || 99.99,
        rating: req.body.rating || 4.5,
        image: req.body.image || 'https://example.com/product.jpg',
        categoryId: req.body.categoryId || 1,
        categoryName: req.body.categoryName || 'Electronics',
        priority: req.body.priority || 10,
        specialPrice: req.body.specialPrice || 79.99,
        isActive: req.body.isActive !== false
      }
    });
    res.json(display);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start test servers
const analyticsPort = 9087;
const contentPort = 9088;

analyticsApp.listen(analyticsPort, () => {
  console.log(`Analytics test server running on port ${analyticsPort}`);
});

contentApp.listen(contentPort, () => {
  console.log(`Content test server running on port ${contentPort}`);
});

// Run tests after servers start
setTimeout(async () => {
  const axios = require('axios');
  
  try {
    console.log('\n=== Testing Direct Database Operations ===');
    
    // Test analytics
    const analyticsRes = await axios.post(`http://localhost:${analyticsPort}/test/view-history`, {
      userId: 'testuser',
      productId: 1
    });
    console.log('✓ Analytics DB write:', analyticsRes.data);
    
    // Test content
    const contentRes = await axios.post(`http://localhost:${contentPort}/test/display`, {
      displayType: 'SALE',
      productName: 'Sale Product'
    });
    console.log('✓ Content DB write:', contentRes.data);
    
  } catch (error) {
    console.error('✗ Test error:', error.response?.data || error.message);
  } finally {
    await analyticsPrisma.$disconnect();
    await contentPrisma.$disconnect();
    process.exit(0);
  }
}, 1000);