const NodeCache = require('node-cache');
const logger = require('../utils/logger');

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: parseInt(process.env.CACHE_TTL || '300'), // 5 minutes default
      checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || '320'), // Check expired keys every 5.33 minutes
      useClones: false, // Better performance, but be careful with object mutations
      maxKeys: parseInt(process.env.CACHE_MAX_KEYS || '1000') // Maximum number of keys
    });

    this.cache.on('set', (key, value) => {
      logger.debug(`Cache SET: ${key}`);
    });

    this.cache.on('del', (key, value) => {
      logger.debug(`Cache DEL: ${key}`);
    });

    this.cache.on('expired', (key, value) => {
      logger.debug(`Cache EXPIRED: ${key}`);
    });
  }

  generateKey(service, operation, ...params) {
    return `${service}:${operation}:${params.join(':')}`;
  }

  async get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      logger.debug(`Cache HIT: ${key}`);
      return value;
    }
    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  async set(key, value, ttl = null) {
    const success = this.cache.set(key, value, ttl);
    if (success) {
      logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'})`);
    }
    return success;
  }

  async del(key) {
    const deletedCount = this.cache.del(key);
    logger.debug(`Cache DELETE: ${key} (deleted: ${deletedCount})`);
    return deletedCount > 0;
  }

  async flush() {
    this.cache.flushAll();
    logger.info('Cache flushed');
  }

  getStats() {
    return this.cache.getStats();
  }

  async getOrSet(key, fetchFunction, ttl = null) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const value = await fetchFunction();
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }
      return value;
    } catch (error) {
      logger.error(`Error in cache getOrSet for key ${key}:`, error);
      throw error;
    }
  }

  invalidatePattern(pattern) {
    const keys = this.cache.keys();
    const keysToDelete = keys.filter(key => key.includes(pattern));
    
    if (keysToDelete.length > 0) {
      this.cache.del(keysToDelete);
      logger.debug(`Cache invalidated pattern: ${pattern}, keys: ${keysToDelete.length}`);
    }
    
    return keysToDelete.length;
  }
}

const cacheManager = new CacheManager();

module.exports = cacheManager;