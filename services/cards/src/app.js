const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const OpenAPIBackend = require('openapi-backend').default;
const correlationId = require('../../../shared/middleware/correlationId');
const errorHandler = require('../../../shared/middleware/errorHandler');
const controllers = require('./controllers');

dotenv.config();

// Initialize OpenAPI Backend
const api = new OpenAPIBackend({
  definition: path.join(__dirname, '../openapi.yaml'),
  handlers: {
    createCard: controllers.createCard,
    fetchCard: controllers.fetchCard,
    updateCard: controllers.updateCard,
    deleteCard: controllers.deleteCard,
    getBuildInfo: controllers.getBuildInfo,
    getContactInfo: controllers.getContactInfo,
    healthCheck: (c, req, res) => res.status(200).json({ 
      status: 'UP', 
      timestamp: new Date().toISOString(),
      service: 'cards-service'
    }),
    validationFail: (c, req, res, err) => {
      res.status(400).json({
        apiPath: req.path,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: err?.message || 'Validation failed',
        errorTime: new Date().toISOString()
      });
    },
    notFound: (req, res) => {
      res.status(404).json({
        apiPath: req.path,
        errorCode: 'NOT_FOUND',
        errorMessage: 'API endpoint not found',
        errorTime: new Date().toISOString()
      });
    }
  }
});

api.init();

const app = express();
app.use(cors());
app.use(express.json());
app.use(correlationId);

// Use OpenAPI Backend to handle all requests
app.use((req, res) => api.handleRequest(req, req, res));

app.use(errorHandler);

module.exports = app;
