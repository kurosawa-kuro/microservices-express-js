const { PrismaClient } = require('@prisma/client');

class DatabaseConnection {
  constructor() {
    this.clients = new Map();
  }

  getClient(databaseName) {
    const env = process.env.NODE_ENV || 'development';
    const clientKey = `${databaseName}_${env}`;
    
    if (!this.clients.has(clientKey)) {
      const baseUrl = process.env[`DATABASE_URL_${databaseName.toUpperCase()}`] || process.env.DATABASE_URL;
      
      const schemaUrl = baseUrl.includes('?schema=') ? baseUrl : `${baseUrl}?schema=${databaseName}`;
      
      const client = new PrismaClient({
        datasources: {
          db: {
            url: schemaUrl
          }
        },
        log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        __internal: {
          engine: {
            connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
            pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '10000'),
            schema_cache_size: parseInt(process.env.DB_SCHEMA_CACHE_SIZE || '1000'),
          }
        }
      });

      process.on('SIGINT', async () => {
        await client.$disconnect();
      });

      process.on('SIGTERM', async () => {
        await client.$disconnect();
      });

      this.clients.set(clientKey, client);
    }

    return this.clients.get(clientKey);
  }

  async closeAll() {
    for (const [name, client] of this.clients) {
      await client.$disconnect();
    }
    this.clients.clear();
  }
}

const databaseConnection = new DatabaseConnection();

module.exports = {
  getAuthClient: () => databaseConnection.getClient('auth'),
  getUsersClient: () => databaseConnection.getClient('users'),
  getProductsClient: () => databaseConnection.getClient('products'),
  getCartClient: () => databaseConnection.getClient('cart'),
  getOrdersClient: () => databaseConnection.getClient('orders'),
  getPaymentsClient: () => databaseConnection.getClient('payments'),
  getAnalyticsClient: () => databaseConnection.getClient('analytics'),
  getContentClient: () => databaseConnection.getClient('content'),
  closeAllConnections: () => databaseConnection.closeAll()
};
