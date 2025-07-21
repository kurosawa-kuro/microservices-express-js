const jwt = require('jsonwebtoken');

function generateTestToken(userInfo) {
  const payload = {
    sub: userInfo.sub || 'test-user-123',
    email: userInfo.email || 'test@kurobytes.com',
    name: userInfo.name || 'Test User',
    realm_access: {
      roles: userInfo.roles || ['ACCOUNTS', 'CARDS', 'LOANS']
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
    roles: ['ACCOUNTS', 'CARDS', 'LOANS']
  }));
  console.log('');
  
  console.log('Accounts user (ACCOUNTS role only):');
  console.log(generateTestToken({
    sub: 'accounts-123',
    email: 'accounts@kurobytes.com',
    name: 'Accounts User',
    roles: ['ACCOUNTS']
  }));
  console.log('');
  
  console.log('Cards user (CARDS role only):');
  console.log(generateTestToken({
    sub: 'cards-123',
    email: 'cards@kurobytes.com',
    name: 'Cards User',
    roles: ['CARDS']
  }));
}

module.exports = { generateTestToken };
