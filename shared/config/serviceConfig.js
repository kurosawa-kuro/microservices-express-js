/**
 * Service configuration utility for Cloud-Shop microservices
 */

const defaults = require('./defaults');
const { validateServiceConfig, validateRequiredVars } = require('./validators');

/**
 * Get configuration for a specific service
 * @param {string} serviceName - Name of the service
 * @param {Object} customDefaults - Custom default values to override
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {Object} Service configuration object
 */
function getConfig(serviceName, customDefaults = {}, env = process.env) {
  try {
    // Validate environment variables
    const validatedEnv = validateServiceConfig(serviceName, env);
    
    // Get service-specific defaults
    const serviceDefaults = defaults.services[serviceName] || {};
    
    // Merge defaults: customDefaults > serviceDefaults > globalDefaults
    const mergedDefaults = {
      ...defaults.server,
      ...serviceDefaults,
      ...customDefaults
    };

    // Build configuration object
    const config = {
      // Server configuration
      port: validatedEnv.PORT || mergedDefaults.port || defaults.server.port,
      host: mergedDefaults.host || defaults.server.host,
      nodeEnv: validatedEnv.NODE_ENV || 'development',
      
      // CORS configuration
      cors: {
        origin: validatedEnv.CORS_ORIGIN || mergedDefaults.cors?.origin || defaults.server.cors.origin,
        credentials: mergedDefaults.cors?.credentials || defaults.server.cors.credentials
      },
      
      // Database configuration
      database: {
        url: validatedEnv.DATABASE_URL,
        connectionLimit: validatedEnv.DB_CONNECTION_LIMIT || defaults.database.connectionLimit,
        poolTimeout: validatedEnv.DB_POOL_TIMEOUT || defaults.database.poolTimeout,
        schemaCacheSize: validatedEnv.DB_SCHEMA_CACHE_SIZE || defaults.database.schemaCacheSize,
        logQueries: validatedEnv.NODE_ENV === 'development'
      },
      
      // Logging configuration
      logging: {
        level: validatedEnv.LOG_LEVEL || defaults.logging.level,
        format: defaults.logging.format,
        timestamp: defaults.logging.timestamp
      },
      
      // Security configuration
      security: {
        helmet: defaults.security.helmet,
        rateLimit: defaults.security.rateLimit
      },
      
      // Kafka configuration
      kafka: {
        clientId: validatedEnv.KAFKA_CLIENT_ID || defaults.kafka.clientId,
        brokers: validatedEnv.KAFKA_BROKERS?.split(',') || defaults.kafka.brokers,
        retry: defaults.kafka.retry
      },
      
      // Cache configuration
      cache: defaults.cache,
      
      // Health check configuration
      health: defaults.health,
      
      // Service-specific configuration
      service: {
        name: serviceName,
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    // Add service-specific configurations
    if (serviceName === 'auth') {
      config.auth = {
        jwtSecret: validatedEnv.JWT_SECRET,
        jwtExpiresIn: validatedEnv.JWT_EXPIRES_IN || '24h',
        keycloak: {
          url: validatedEnv.KEYCLOAK_URL,
          realm: validatedEnv.KEYCLOAK_REALM,
          clientId: validatedEnv.KEYCLOAK_CLIENT_ID,
          clientSecret: validatedEnv.KEYCLOAK_CLIENT_SECRET
        }
      };
    }

    if (serviceName === 'gateway') {
      config.gateway = {
        timeout: mergedDefaults.timeout || defaults.services.gateway.timeout
      };
    }

    return config;
  } catch (error) {
    console.error(`Configuration error for service ${serviceName}:`, error.message);
    throw error;
  }
}

/**
 * Get database configuration for a service
 * @param {string} serviceName - Name of the service
 * @param {Object} env - Environment variables object
 * @returns {Object} Database configuration
 */
function getDatabaseConfig(serviceName, env = process.env) {
  const config = getConfig(serviceName, {}, env);
  return config.database;
}

/**
 * Get server configuration for a service
 * @param {string} serviceName - Name of the service
 * @param {Object} env - Environment variables object
 * @returns {Object} Server configuration
 */
function getServerConfig(serviceName, env = process.env) {
  const config = getConfig(serviceName, {}, env);
  return {
    port: config.port,
    host: config.host,
    nodeEnv: config.nodeEnv,
    cors: config.cors
  };
}

/**
 * Validate required configuration for service startup
 * @param {string} serviceName - Name of the service
 * @param {string[]} requiredVars - Required environment variables
 * @param {Object} env - Environment variables object
 * @returns {boolean} True if validation passes
 */
function validateStartupConfig(serviceName, requiredVars = [], env = process.env) {
  try {
    // Validate service configuration
    getConfig(serviceName, {}, env);
    
    // Validate required environment variables
    if (requiredVars.length > 0) {
      validateRequiredVars(requiredVars, env);
    }
    
    return true;
  } catch (error) {
    console.error(`Startup configuration validation failed for ${serviceName}:`, error.message);
    throw error;
  }
}

/**
 * Get configuration for all services
 * @param {Object} env - Environment variables object
 * @returns {Object} Configuration for all services
 */
function getAllServiceConfigs(env = process.env) {
  const services = ['auth', 'users', 'gateway', 'products', 'cart', 'orders', 'message'];
  const configs = {};
  
  for (const service of services) {
    try {
      configs[service] = getConfig(service, {}, env);
    } catch (error) {
      console.warn(`Failed to get config for service ${service}:`, error.message);
    }
  }
  
  return configs;
}

module.exports = {
  getConfig,
  getDatabaseConfig,
  getServerConfig,
  validateStartupConfig,
  getAllServiceConfigs,
  defaults
}; 