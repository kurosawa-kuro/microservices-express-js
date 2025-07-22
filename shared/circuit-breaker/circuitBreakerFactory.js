const CircuitBreaker = require('opossum');
const logger = require('../utils/logger');

class CircuitBreakerFactory {
  constructor() {
    this.breakers = new Map();
  }

  createBreaker(name, action, options = {}) {
    if (this.breakers.has(name)) {
      return this.breakers.get(name);
    }

    const defaultOptions = {
      timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '3000'), // 3 seconds
      errorThresholdPercentage: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD || '50'), // 50%
      resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000'), // 30 seconds
      rollingCountTimeout: parseInt(process.env.CIRCUIT_BREAKER_ROLLING_TIMEOUT || '10000'), // 10 seconds
      rollingCountBuckets: parseInt(process.env.CIRCUIT_BREAKER_ROLLING_BUCKETS || '10'),
      name: name,
      volumeThreshold: parseInt(process.env.CIRCUIT_BREAKER_VOLUME_THRESHOLD || '10') // Minimum 10 requests
    };

    const finalOptions = { ...defaultOptions, ...options };
    const breaker = new CircuitBreaker(action, finalOptions);

    // Event listeners for monitoring
    breaker.on('open', () => {
      logger.warn(`Circuit breaker [${name}] opened - requests will be rejected`);
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker [${name}] half-opened - testing service availability`);
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker [${name}] closed - service is healthy`);
    });

    breaker.on('reject', () => {
      logger.debug(`Circuit breaker [${name}] rejected request`);
    });

    breaker.on('timeout', () => {
      logger.warn(`Circuit breaker [${name}] timeout occurred`);
    });

    breaker.on('failure', (error) => {
      logger.warn(`Circuit breaker [${name}] failure:`, error.message);
    });

    breaker.on('success', () => {
      logger.debug(`Circuit breaker [${name}] success`);
    });

    // Set fallback function
    breaker.fallback((error) => {
      logger.error(`Circuit breaker [${name}] fallback triggered:`, error.message);
      
      if (error.code === 'EOPENBREAKER') {
        throw new Error(`Service ${name} is temporarily unavailable - circuit breaker is open`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Service ${name} request timeout`);
      } else {
        throw new Error(`Service ${name} is temporarily unavailable`);
      }
    });

    this.breakers.set(name, breaker);
    logger.info(`Circuit breaker created for [${name}] with options:`, finalOptions);
    
    return breaker;
  }

  getBreaker(name) {
    return this.breakers.get(name);
  }

  getBreakerStats(name) {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    return {
      name,
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      stats: breaker.stats.toJSON()
    };
  }

  getAllBreakerStats() {
    const stats = {};
    for (const [name, breaker] of this.breakers) {
      stats[name] = this.getBreakerStats(name);
    }
    return stats;
  }

  async shutdown() {
    logger.info('Shutting down all circuit breakers');
    for (const [name, breaker] of this.breakers) {
      try {
        await breaker.shutdown();
        logger.debug(`Circuit breaker [${name}] shut down`);
      } catch (error) {
        logger.error(`Error shutting down circuit breaker [${name}]:`, error);
      }
    }
    this.breakers.clear();
  }
}

const circuitBreakerFactory = new CircuitBreakerFactory();

// Graceful shutdown
process.on('SIGINT', () => {
  circuitBreakerFactory.shutdown();
});

process.on('SIGTERM', () => {
  circuitBreakerFactory.shutdown();
});

module.exports = circuitBreakerFactory;