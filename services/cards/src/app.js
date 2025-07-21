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

app.post('/api/create', controllers.createCard);
app.get('/api/fetch', controllers.fetchCard);
app.put('/api/update', controllers.updateCard);
app.delete('/api/delete', controllers.deleteCard);
app.get('/api/build-info', controllers.getBuildInfo);
app.get('/api/contact-info', controllers.getContactInfo);

app.get('/actuator/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    service: 'cards-service'
  });
});

app.use(errorHandler);

module.exports = app;
