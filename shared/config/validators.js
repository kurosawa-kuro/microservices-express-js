/**
 * Environment variable validators for Cloud-Shop microservices
 */

const { z } = require('zod');

// Base validation schemas
const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  CORS_ORIGIN: z.string().optional(),
});

// Database validation schema
const databaseSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DB_CONNECTION_LIMIT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).default('10'),
  DB_POOL_TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(60000)).default('10000'),
  DB_SCHEMA_CACHE_SIZE: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(100).max(10000)).default('1000'),
});

// Kafka validation schema
const kafkaSchema = z.object({
  KAFKA_BROKERS: z.string().optional(),
  KAFKA_CLIENT_ID: z.string().optional(),
});

// Auth service specific schema
const authSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  KEYCLOAK_URL: z.string().url().optional(),
  KEYCLOAK_REALM: z.string().optional(),
  KEYCLOAK_CLIENT_ID: z.string().optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().optional(),
});

// Service-specific validation schemas
const serviceSchemas = {
  auth: baseSchema.merge(databaseSchema).merge(authSchema),
  users: baseSchema.merge(databaseSchema),
  gateway: baseSchema.merge(kafkaSchema),
  products: baseSchema.merge(databaseSchema),
  cart: baseSchema.merge(databaseSchema),
  orders: baseSchema.merge(databaseSchema),
  message: baseSchema.merge(kafkaSchema),
};

/**
 * Validate environment variables for a specific service
 * @param {string} serviceName - Name of the service
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {Object} Validated configuration object
 */
function validateServiceConfig(serviceName, env = process.env) {
  try {
    const schema = serviceSchemas[serviceName];
    if (!schema) {
      throw new Error(`No validation schema found for service: ${serviceName}`);
    }

    const validated = schema.parse(env);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      throw new Error(`Configuration validation failed for ${serviceName}: ${validationErrors}`);
    }
    throw error;
  }
}

/**
 * Validate required environment variables are present
 * @param {string[]} requiredVars - Array of required environment variable names
 * @param {Object} env - Environment variables object (defaults to process.env)
 * @returns {boolean} True if all required variables are present
 */
function validateRequiredVars(requiredVars, env = process.env) {
  const missing = requiredVars.filter(varName => !env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  return true;
}

/**
 * Validate database URL format
 * @param {string} databaseUrl - Database URL to validate
 * @returns {boolean} True if URL is valid
 */
function validateDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return url.protocol === 'postgresql:' || url.protocol === 'postgres:';
  } catch (error) {
    throw new Error(`Invalid database URL format: ${databaseUrl}`);
  }
}

module.exports = {
  validateServiceConfig,
  validateRequiredVars,
  validateDatabaseUrl,
  serviceSchemas,
}; 