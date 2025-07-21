const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const correlationId = require('../../../shared/middleware/correlationId');
const errorHandler = require('../../../shared/middleware/errorHandler');
const logger = require('../../../shared/utils/logger');
const createHealthCheckHandler = require('../../../shared/utils/healthCheckUtility');

dotenv.config();

const healthCheckHandler = createHealthCheckHandler('message-service');

const app = express();

app.use(cors());
app.use(express.json());
app.use(correlationId);

app.get('/actuator/health', healthCheckHandler);

app.get('/api/build-info', (req, res) => {
  res.status(200).json({
    version: process.env.BUILD_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/contact-info', (req, res) => {
  res.status(200).json({
    name: 'Kuro Bytes - Message Service',
    email: 'support@kurobytes.com',
    onCallSupport: '+1-555-MESSAGE'
  });
});

app.use(errorHandler);

module.exports = app;
