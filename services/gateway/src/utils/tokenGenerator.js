const jwt = require('jsonwebtoken');

function generateTestToken(userInfo) {
  const payload = {
    sub: userInfo.sub || 'test-user-123',
    email: userInfo.email || 'test@kurobytes.com',
    name: userInfo.name || 'Test User',
    realm_access: {
      roles: userInfo.roles || ['customer']
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiration
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key-here');
}

if (require.main === module) {
  console.log('Sample JWT tokens for testing:');
  console.log('');
  
  console.log('Admin user (all roles):');
  console.log(generateTestToken({
    sub: 'admin-123',
    email: 'admin@kurobytes.com',
    name: 'Admin User',
    roles: ['admin', 'vendor', 'customer']
  }));
  console.log('');
  
  console.log('Customer user (customer role):');
  console.log(generateTestToken({
    sub: 'customer-123',
    email: 'customer@kurobytes.com',
    name: 'Customer User',
    roles: ['customer']
  }));
  console.log('');

  console.log('Vendor user (vendor role):');
  console.log(generateTestToken({
    sub: 'vendor-123',
    email: 'vendor@kurobytes.com',
    name: 'Vendor User',
    roles: ['vendor']
  }));
}

module.exports = { generateTestToken };
