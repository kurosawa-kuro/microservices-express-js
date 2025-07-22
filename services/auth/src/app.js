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

app.use((req, res, next) => {
  req.correlationId = req.headers['kurobank-correlation-id'] || `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  logger.info(`${req.method} ${req.path}`, { correlationId: req.correlationId });
  next();
});

app.use('/kurobank/auth', (req, res) => api.handleRequest(req, req, res));

app.get('/actuator/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;
