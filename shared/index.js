/**
 * Cloud-Shop Shared Library
 * Main entry point for shared utilities and middleware
 */

// Configuration management
const config = require('./config/serviceConfig');
const validators = require('./config/validators');
const defaults = require('./config/defaults');

// Response helpers
const responseHelpers = require('./utils/responseHelpers');

// Database utilities
const { getAuthClient, getUsersClient, getProductsClient, getCartClient, getOrdersClient, closeAllConnections } = require('./database/prismaClient');

// Middleware
const errorHandler = require('./middleware/errorHandler');
const correlationId = require('./middleware/correlationId');

// Health check utilities
const healthCheck = require('./health/healthCheck');
const healthChecker = require('./health/healthChecker');

// Circuit breaker
const circuitBreaker = require('./circuit-breaker/circuitBreaker');

// Cache utilities
const cache = require('./cache/cache');

// Logger
const logger = require('./utils/logger');

module.exports = {
  // Configuration
  config,
  validators,
  defaults,
  
  // Response helpers
  responseHelpers,
  
  // Database
  database: {
    getAuthClient,
    getUsersClient,
    getProductsClient,
    getCartClient,
    getOrdersClient,
    closeAllConnections
  },
  
  // Middleware
  middleware: {
    errorHandler: errorHandler.errorHandler,
    createStandardError: errorHandler.createStandardError,
    correlationId,
    responseHelpers: responseHelpers.responseHelpersMiddleware
  },
  
  // Utilities
  healthCheck,
  healthChecker,
  circuitBreaker,
  cache,
  logger,
  
  // Response helper functions (for direct use)
  createStandardResponse: responseHelpers.createStandardResponse,
  createPaginatedResponse: responseHelpers.createPaginatedResponse,
  createEmptyResponse: responseHelpers.createEmptyResponse,
  createListResponse: responseHelpers.createListResponse,
  createItemResponse: responseHelpers.createItemResponse,
  createCreatedResponse: responseHelpers.createCreatedResponse,
  createUpdatedResponse: responseHelpers.createUpdatedResponse,
  createDeletedResponse: responseHelpers.createDeletedResponse
}; 