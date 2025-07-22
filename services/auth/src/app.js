const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const OpenAPIBackend = require('openapi-backend').default;
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Shared utilities
const { config, middleware, logger } = require('../../../shared');
const { getConfig, validateStartupConfig } = config;
const { errorHandler, correlationId, responseHelpers } = middleware;

// Validate startup configuration
try {
  validateStartupConfig('auth', ['JWT_SECRET']);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

// Get service configuration
const serviceConfig = getConfig('auth');

const app = express();

// Security middleware
app.use(helmet(serviceConfig.security.helmet));
app.use(cors(serviceConfig.cors));
app.use(express.json());

// Shared middleware
app.use(correlationId);
app.use(responseHelpers);

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const api = new OpenAPIBackend({
  definition: openApiSpec,
  handlers: {
    verifyToken: require('./controllers/authController').verifyToken,
    refreshToken: require('./controllers/authController').refreshToken,
    revokeToken: require('./controllers/authController').revokeToken,
    getUserRoles: require('./controllers/authController').getUserRoles,
    assignRole: require('./controllers/authController').assignRole,
    removeRole: require('./controllers/authController').removeRole,
    validationFail: (c, req, res) => res.status(400).json({ error: c.validation.errors }),
    notFound: (c, req, res) => res.status(404).json({ error: 'Not found' }),
    methodNotAllowed: (c, req, res) => res.status(405).json({ error: 'Method not allowed' })
  }
});

api.init();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    correlationId: req.correlationId,
    service: 'auth-service'
  });
  next();
});

app.use('/cloud-shop/auth', (req, res) => api.handleRequest(req, req, res));

app.get('/actuator/health', (req, res) => {
  res.standardResponse({
    status: 'UP',
    service: 'auth-service',
    version: serviceConfig.service.version
  }, 200, 'Auth service is healthy');
});

app.use(errorHandler);

module.exports = app;
