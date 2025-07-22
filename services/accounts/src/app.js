const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const OpenAPIBackend = require('openapi-backend').default;
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const correlationId = require('../../../shared/middleware/correlationId');
const errorHandler = require('../../../shared/middleware/errorHandler');
const bigIntSerializer = require('../../../shared/middleware/bigIntSerializer');
const createOpenApiHandlers = require('../../../shared/middleware/openApiHandlers');
const createCommonHandlers = require('../../../shared/utils/commonHandlers');
const controllers = require('./controllers');

dotenv.config();

const openApiHandlers = createOpenApiHandlers('accounts-service');
const commonHandlers = createCommonHandlers('accounts');

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
    healthCheck: openApiHandlers.healthCheck,
    validationFail: openApiHandlers.validationFail,
    notFound: openApiHandlers.notFound
  }
});

api.init();

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const app = express();
app.use(cors());
app.use(express.json());
app.use(correlationId);
app.use(bigIntSerializer);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

// Use OpenAPI Backend to handle all requests
app.use((req, res) => api.handleRequest(req, req, res));

app.use(errorHandler);

module.exports = app;
