const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const OpenAPIBackend = require('openapi-backend').default;
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const fs = require('fs');
const path = require('path');
const logger = require('../../../shared/utils/logger');
const { errorHandler } = require('../../../shared/middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const api = new OpenAPIBackend({
  definition: openApiSpec,
  strict: false,
  validate: true,
  handlers: {
    createViewHistory: require('./controllers/analyticsController').createViewHistory,
    getViewHistory: require('./controllers/analyticsController').getViewHistory,
    getUserViewHistory: require('./controllers/analyticsController').getUserViewHistory,
    createUserActionLog: require('./controllers/analyticsController').createUserActionLog,
    getUserActionLogs: require('./controllers/analyticsController').getUserActionLogs,
    getActionLogsByType: require('./controllers/analyticsController').getActionLogsByType,
    deleteViewHistory: require('./controllers/analyticsController').deleteViewHistory,
    healthCheck: (c, req, res) => res.status(200).json({
      status: 'UP',
      service: 'analytics-service',
      timestamp: new Date().toISOString()
    }),
    validationFail: (c, req, res) => res.status(400).json({ error: c.validation.errors }),
    notFound: (c, req, res) => res.status(404).json({ error: 'Not found' }),
    methodNotAllowed: (c, req, res) => res.status(405).json({ error: 'Method not allowed' })
  }
});

api.init();

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use((req, res, next) => {
  req.correlationId = req.headers['cloud-shop-correlation-id'] || `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info(`${req.method} ${req.path}`, { correlationId: req.correlationId });
  next();
});

app.use('/api/analytics', (req, res, next) => api.handleRequest(req, req, res, next));

app.get('/actuator/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'analytics-service',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;
