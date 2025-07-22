const { PrismaClient } = require('@prisma/client');

class DatabaseConnection {
  constructor() {
    this.clients = new Map();
  }

  getClient(databaseName) {
    if (!this.clients.has(databaseName)) {
      const client = new PrismaClient({
        datasources: {
          db: {
            url: process.env[`DATABASE_URL_${databaseName.toUpperCase()}`] || process.env.DATABASE_URL
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

      this.clients.set(databaseName, client);
    }

    return this.clients.get(databaseName);
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
  getCardsClient: () => databaseConnection.getClient('cards'),
  getLoansClient: () => databaseConnection.getClient('loans'),
  closeAllConnections: () => databaseConnection.closeAll()
};
