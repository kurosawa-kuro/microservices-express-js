const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const OpenAPIBackend = require('openapi-backend').default;
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const correlationId = require('../../../shared/middleware/correlationId');
const { errorHandler } = require('../../../shared/middleware/errorHandler');
const bigIntSerializer = require('../../../shared/middleware/bigIntSerializer');
const createTimeoutMiddleware = require('../../../shared/middleware/timeoutMiddleware');
const createOpenApiHandlers = require('../../../shared/middleware/openApiHandlers');
const createCommonHandlers = require('../../../shared/utils/commonHandlers');
const createHealthCheckHandler = require('../../../shared/utils/healthCheckUtility');
const controllers = require('./controllers');

dotenv.config();

const openApiHandlers = createOpenApiHandlers('accounts-service');
const commonHandlers = createCommonHandlers('accounts');
const { getAccountsClient } = require('../../../shared/database/prismaClient');
const HealthChecker = require('../../../shared/health/healthChecker');
const { Kafka } = require('kafkajs');

// Setup health checks
const prismaClient = getAccountsClient();
const kafka = new Kafka({
  clientId: 'accounts-service-health',
  brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
});

const customHealthChecks = [
  HealthChecker.createDatabaseCheck(prismaClient, 'accounts-database'),
  HealthChecker.createKafkaCheck(kafka, 'kafka-broker')
];

// Initialize OpenAPI Backend
const api = new OpenAPIBackend({
  definition: path.join(__dirname, '../openapi.yaml'),
  handlers: {
    createAccount: controllers.createAccount,
    fetchAccount: controllers.fetchAccount, 
    updateAccount: controllers.updateAccount,
    deleteAccount: controllers.deleteAccount,
    fetchCustomerDetails: controllers.fetchCustomerDetails,
    getBuildInfo: commonHandlers.getBuildInfo,
    getContactInfo: commonHandlers.getContactInfo,
    healthCheck: createHealthCheckHandler('accounts-service', { customChecks: customHealthChecks }),
    validationFail: openApiHandlers.validationFail,
    notFound: openApiHandlers.notFound
  }
});

api.init();

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const app = express();
app.use(helmet());
app.use(createTimeoutMiddleware());
app.use(cors());
app.use(express.json());
app.use(correlationId);
app.use(bigIntSerializer);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Use OpenAPI Backend to handle all requests
app.use((req, res) => api.handleRequest(req, req, res));

app.use(errorHandler);

module.exports = app;
