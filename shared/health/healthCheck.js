/**
 * Standardized health check system for Cloud-Shop microservices
 */

const HealthChecker = require('./healthChecker');
const logger = require('../utils/logger');

class StandardHealthCheck {
  constructor(serviceName, serviceConfig) {
    this.serviceName = serviceName;
    this.serviceConfig = serviceConfig;
    this.healthChecker = new HealthChecker();
    this.initialized = false;
  }

  /**
   * Initialize health checks for the service
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // Add basic service health check
    this.healthChecker.addCheck('service', async () => {
      return {
        name: this.serviceName,
        version: this.serviceConfig.service.version,
        environment: this.serviceConfig.nodeEnv,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      };
    }, { critical: true });

    // Add database health check if database configuration exists
    if (this.serviceConfig.database && this.serviceConfig.database.url) {
      try {
        const { database } = require('../database/prismaClient');
        const clientGetter = this.getDatabaseClient();
        
        if (clientGetter) {
          this.healthChecker.addCheck('database', async () => {
            const client = clientGetter();
            await client.$queryRaw`SELECT 1`;
            return { connection: 'healthy' };
          }, { critical: true, timeout: 3000 });
        }
      } catch (error) {
        logger.warn(`Database health check not added for ${this.serviceName}:`, error.message);
      }
    }

    // Add Kafka health check if Kafka configuration exists
    if (this.serviceConfig.kafka && this.serviceConfig.kafka.brokers) {
      try {
        const { Kafka } = require('kafkajs');
        const kafka = new Kafka({
          clientId: this.serviceConfig.kafka.clientId,
          brokers: this.serviceConfig.kafka.brokers
        });

        this.healthChecker.addCheck('kafka', async () => {
          const admin = kafka.admin();
          await admin.connect();
          const metadata = await admin.fetchTopicMetadata();
          await admin.disconnect();
          return { 
            connection: 'healthy',
            topics: Object.keys(metadata.topics).length
          };
        }, { critical: false, timeout: 5000 });
      } catch (error) {
        logger.warn(`Kafka health check not added for ${this.serviceName}:`, error.message);
      }
    }

    this.initialized = true;
    logger.info(`Health checks initialized for ${this.serviceName}`);
  }

  /**
   * Get database client based on service name
   */
  getDatabaseClient() {
    const { database } = require('../database/prismaClient');
    
    const clientMap = {
      'auth': database.getAuthClient,
      'users': database.getUsersClient,
      'products': database.getProductsClient,
      'cart': database.getCartClient,
      'orders': database.getOrdersClient
    };

    return clientMap[this.serviceName];
  }

  /**
   * Add custom health check
   */
  addCheck(name, checkFunction, options = {}) {
    this.healthChecker.addCheck(name, checkFunction, options);
  }

  /**
   * Remove health check
   */
  removeCheck(name) {
    this.healthChecker.removeCheck(name);
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    if (!this.initialized) {
      this.initialize();
    }

    const healthStatus = await this.healthChecker.getHealthStatus();
    
    return {
      status: healthStatus.status,
      service: this.serviceName,
      version: this.serviceConfig.service.version,
      timestamp: healthStatus.timestamp,
      checks: healthStatus.checks,
      summary: healthStatus.summary
    };
  }

  /**
   * Create Express middleware for health check endpoint
   */
  createHealthCheckMiddleware() {
    return async (req, res, next) => {
      if (req.path === '/actuator/health') {
        try {
          const healthStatus = await this.getHealthStatus();
          
          // Use standard response format
          if (res.standardResponse) {
            return res.standardResponse(healthStatus, 200, `${this.serviceName} service health check`);
          } else {
            return res.status(200).json(healthStatus);
          }
        } catch (error) {
          logger.error(`Health check failed for ${this.serviceName}:`, error);
          
          const errorStatus = {
            status: 'DOWN',
            service: this.serviceName,
            version: this.serviceConfig.service.version,
            timestamp: new Date().toISOString(),
            error: error.message,
            checks: {},
            summary: { total: 0, up: 0, down: 1 }
          };

          if (res.standardResponse) {
            return res.standardResponse(errorStatus, 503, `Health check failed for ${this.serviceName}`);
          } else {
            return res.status(503).json(errorStatus);
          }
        }
      }
      next();
    };
  }

  /**
   * Create simple health check endpoint (for backward compatibility)
   */
  createSimpleHealthCheck() {
    return (req, res) => {
      const simpleStatus = {
        status: 'UP',
        service: this.serviceName,
        version: this.serviceConfig.service.version,
        timestamp: new Date().toISOString()
      };

      if (res.standardResponse) {
        return res.standardResponse(simpleStatus, 200, `${this.serviceName} service is healthy`);
      } else {
        return res.status(200).json(simpleStatus);
      }
    };
  }
}

/**
 * Factory function to create health check instance
 */
function createHealthCheck(serviceName, serviceConfig) {
  return new StandardHealthCheck(serviceName, serviceConfig);
}

/**
 * Express middleware factory for health check endpoint
 */
function healthCheckMiddleware(serviceName, serviceConfig) {
  const healthCheck = createHealthCheck(serviceName, serviceConfig);
  return healthCheck.createHealthCheckMiddleware();
}

/**
 * Simple health check endpoint factory
 */
function simpleHealthCheck(serviceName, serviceConfig) {
  const healthCheck = createHealthCheck(serviceName, serviceConfig);
  return healthCheck.createSimpleHealthCheck();
}

module.exports = {
  StandardHealthCheck,
  createHealthCheck,
  healthCheckMiddleware,
  simpleHealthCheck
}; 