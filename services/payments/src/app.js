const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const OpenAPIBackend = require('openapi-backend').default;
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');

const { config, middleware, logger } = require('../../../shared');
const { getConfig, validateStartupConfig } = config;
const { errorHandler, correlationId, responseHelpers } = middleware;

try {
  validateStartupConfig('payments', ['STRIPE_SECRET_KEY']);
} catch (error) {
  console.error('Configuration validation failed:', error.message);
  process.exit(1);
}

const serviceConfig = getConfig('payments');

const app = express();

app.use(helmet(serviceConfig.security.helmet));
app.use(cors(serviceConfig.cors));
app.use(express.json());

app.use(correlationId);
app.use(responseHelpers);

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const api = new OpenAPIBackend({
  definition: openApiSpec,
  handlers: {
    processPayment: require('./controllers/paymentsController').processPayment,
    getPayment: require('./controllers/paymentsController').getPayment,
    refundPayment: require('./controllers/paymentsController').refundPayment,
    getPaymentHistory: require('./controllers/paymentsController').getPaymentHistory,
    validationFail: (c, req, res) => res.status(400).json({ error: c.validation.errors }),
    notFound: (c, req, res) => res.status(404).json({ error: 'Not found' }),
    methodNotAllowed: (c, req, res) => res.status(405).json({ error: 'Method not allowed' })
  }
});

api.init();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    correlationId: req.correlationId,
    service: 'payments-service'
  });
  next();
});

app.use('/cloud-shop/payments', (req, res) => api.handleRequest(req, req, res));

app.get('/actuator/health', (req, res) => {
  res.standardResponse({
    status: 'UP',
    service: 'payments-service',
    version: serviceConfig.service.version
  }, 200, 'Payments service is healthy');
});

app.use(errorHandler);

module.exports = app;
