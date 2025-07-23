const axios = require('axios');

const ANALYTICS_BASE_URL = 'http://localhost:8087';
const CONTENT_BASE_URL = 'http://localhost:8088';

async function testAnalyticsService() {
  console.log('\n=== Testing Analytics Service ===');
  
  try {
    // Test health endpoint
    const health = await axios.get(`${ANALYTICS_BASE_URL}/actuator/health`);
    console.log('✓ Health check:', health.data);
    
    // Test create view history
    const viewHistory = await axios.post(`${ANALYTICS_BASE_URL}/api/analytics/view-history`, {
      userId: 'user123',
      productId: 1,
      productName: 'Test Product',
      productPrice: 99.99,
      categoryId: 1,
      categoryName: 'Electronics'
    });
    console.log('✓ Created view history:', viewHistory.data);
    
    // Test get view history
    const getHistory = await axios.get(`${ANALYTICS_BASE_URL}/api/analytics/view-history/${viewHistory.data.id}`);
    console.log('✓ Retrieved view history:', getHistory.data);
    
    // Test create user action log
    const actionLog = await axios.post(`${ANALYTICS_BASE_URL}/api/analytics/action-logs`, {
      requestID: 'req123',
      userId: 'user123',
      actionType: 'CART_ADD',
      productId: 1,
      productName: 'Test Product',
      productPrice: 99.99,
      quantity: 2
    });
    console.log('✓ Created action log:', actionLog.data);
    
    // Test get user view history
    const userHistory = await axios.get(`${ANALYTICS_BASE_URL}/api/analytics/users/user123/view-history`);
    console.log('✓ Retrieved user view history:', userHistory.data);
    
  } catch (error) {
    console.error('✗ Analytics service error:', error.response?.data || error.message);
  }
}

async function testContentService() {
  console.log('\n=== Testing Content Service ===');
  
  try {
    // Test health endpoint
    const health = await axios.get(`${CONTENT_BASE_URL}/actuator/health`);
    console.log('✓ Health check:', health.data);
    
    // Test create top page display
    const display = await axios.post(`${CONTENT_BASE_URL}/api/content/top-page-displays`, {
      displayType: 'RECOMMENDED',
      productId: 1,
      productName: 'Featured Product',
      productPrice: 149.99,
      rating: 4.5,
      image: 'https://example.com/product.jpg',
      categoryId: 1,
      categoryName: 'Electronics',
      priority: 10,
      specialPrice: 99.99,
      isActive: true
    });
    console.log('✓ Created top page display:', display.data);
    
    // Test get top page display
    const getDisplay = await axios.get(`${CONTENT_BASE_URL}/api/content/top-page-displays/${display.data.id}`);
    console.log('✓ Retrieved top page display:', getDisplay.data);
    
    // Test get active displays
    const activeDisplays = await axios.get(`${CONTENT_BASE_URL}/api/content/top-page-displays/active`);
    console.log('✓ Retrieved active displays:', activeDisplays.data);
    
  } catch (error) {
    console.error('✗ Content service error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await testAnalyticsService();
  await testContentService();
}

runTests().catch(console.error);