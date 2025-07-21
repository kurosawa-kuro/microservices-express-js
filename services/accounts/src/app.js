const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const OpenAPIBackend = require('openapi-backend').default;
const correlationId = require('../../../shared/middleware/correlationId');
const errorHandler = require('../../../shared/middleware/errorHandler');
const controllers = require('./controllers');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(correlationId);

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    return originalJson.call(this, JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )));
  };
  next();
});

app.post('/api/create', controllers.createAccount);
app.get('/api/fetch', controllers.fetchAccount);
app.put('/api/update', controllers.updateAccount);
app.delete('/api/delete', controllers.deleteAccount);
app.get('/api/fetchCustomerDetails', controllers.fetchCustomerDetails);
app.get('/api/build-info', controllers.getBuildInfo);
app.get('/api/contact-info', controllers.getContactInfo);

app.get('/actuator/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    service: 'accounts-service'
  });
});

app.use(errorHandler);

module.exports = app;
