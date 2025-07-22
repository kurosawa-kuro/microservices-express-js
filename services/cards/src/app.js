const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const OpenAPIBackend = require('openapi-backend').default;
const correlationId = require('../shared/middleware/correlationId');
const errorHandler = require('../shared/middleware/errorHandler');
const bigIntSerializer = require('../shared/middleware/bigIntSerializer');
const createOpenApiHandlers = require('../shared/middleware/openApiHandlers');
const createCommonHandlers = require('../shared/utils/commonHandlers');
const controllers = require('./controllers');

dotenv.config();

const openApiHandlers = createOpenApiHandlers('cards-service');
const commonHandlers = createCommonHandlers('cards');

// Initialize OpenAPI Backend
const api = new OpenAPIBackend({
  definition: path.join(__dirname, '../openapi.yaml'),
  handlers: {
    createCard: controllers.createCard,
    fetchCard: controllers.fetchCard,
    updateCard: controllers.updateCard,
    deleteCard: controllers.deleteCard,
    getBuildInfo: commonHandlers.getBuildInfo,
    getContactInfo: commonHandlers.getContactInfo,
    healthCheck: openApiHandlers.healthCheck,
    validationFail: openApiHandlers.validationFail,
    notFound: openApiHandlers.notFound
  }
});

api.init();

const app = express();
app.use(cors());
app.use(express.json());
app.use(correlationId);
app.use(bigIntSerializer);

// Use OpenAPI Backend to handle all requests
app.use((req, res) => api.handleRequest(req, req, res));

app.use(errorHandler);

module.exports = app;
