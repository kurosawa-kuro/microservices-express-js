const logger = require('../utils/logger');

class HealthChecker {
  constructor() {
    this.checks = new Map();
  }

  addCheck(name, checkFunction, options = {}) {
    const defaultOptions = {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
      interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      critical: options.critical !== false // Default to true
    };

    this.checks.set(name, {
      name,
      check: checkFunction,
      options: { ...defaultOptions, ...options },
      lastResult: null,
      lastCheckTime: null
    });

    logger.debug(`Health check added: ${name}`);
  }

  removeCheck(name) {
    this.checks.delete(name);
    logger.debug(`Health check removed: ${name}`);
  }

  async runCheck(name) {
    const checkData = this.checks.get(name);
    if (!checkData) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name,
      status: 'DOWN',
      duration: 0,
      error: null,
      details: null,
      timestamp: new Date().toISOString()
    };

    try {
      const checkPromise = checkData.check();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), checkData.options.timeout);
      });

      const checkResult = await Promise.race([checkPromise, timeoutPromise]);
      
      result.status = 'UP';
      result.duration = Date.now() - startTime;
      result.details = checkResult || {};

      logger.debug(`Health check [${name}] passed in ${result.duration}ms`);
    } catch (error) {
      result.status = 'DOWN';
      result.duration = Date.now() - startTime;
      result.error = error.message;
      
      logger.warn(`Health check [${name}] failed in ${result.duration}ms:`, error.message);
    }

    checkData.lastResult = result;
    checkData.lastCheckTime = Date.now();

    return result;
  }

  async runAllChecks() {
    const results = {};
    const promises = [];

    for (const [name] of this.checks) {
      promises.push(
        this.runCheck(name).then(result => {
          results[name] = result;
        }).catch(error => {
          results[name] = {
            name,
            status: 'DOWN',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        })
      );
    }

    await Promise.all(promises);
    return results;
  }

  async getHealthStatus() {
    const checks = await this.runAllChecks();
    
    let overallStatus = 'UP';
    const criticalChecks = [];
    const nonCriticalChecks = [];

    for (const [name, result] of Object.entries(checks)) {
      const checkData = this.checks.get(name);
      
      if (checkData && checkData.options.critical) {
        criticalChecks.push(result);
        if (result.status === 'DOWN') {
          overallStatus = 'DOWN';
        }
      } else {
        nonCriticalChecks.push(result);
      }
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        critical: criticalChecks,
        nonCritical: nonCriticalChecks
      },
      summary: {
        total: Object.keys(checks).length,
        up: Object.values(checks).filter(c => c.status === 'UP').length,
        down: Object.values(checks).filter(c => c.status === 'DOWN').length
      }
    };

    logger.debug(`Overall health status: ${overallStatus}`);
    return response;
  }

  // Database health check
  static createDatabaseCheck(prismaClient, name = 'database') {
    return {
      name,
      check: async () => {
        await prismaClient.$queryRaw`SELECT 1`;
        return { connection: 'healthy' };
      }
    };
  }

  // Kafka health check
  static createKafkaCheck(kafka, name = 'kafka') {
    return {
      name,
      check: async () => {
        const admin = kafka.admin();
        await admin.connect();
        const metadata = await admin.fetchTopicMetadata();
        await admin.disconnect();
        return { 
          connection: 'healthy',
          topics: Object.keys(metadata.topics).length
        };
      }
    };
  }

  // External service health check
  static createExternalServiceCheck(url, name, options = {}) {
    const axios = require('axios');
    
    return {
      name,
      check: async () => {
        const response = await axios.get(url, {
          timeout: options.timeout || 3000,
          headers: options.headers || {}
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          responseTime: Date.now() - Date.now()
        };
      }
    };
  }
}

module.exports = HealthChecker;