const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const correlationId = require('../../../shared/middleware/correlationId');
const errorHandler = require('../../../shared/middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware');
const logger = require('../../../shared/utils/logger');
const createHealthCheckHandler = require('../../../shared/utils/healthCheckUtility');

dotenv.config();

const healthCheckHandler = createHealthCheckHandler('gateway-service');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'kurobank-correlation-id']
}));

app.use(express.json());
app.use(correlationId);

app.get('/actuator/health', healthCheckHandler);

app.use('/public/**', createProxyMiddleware({
  target: process.env.ACCOUNTS_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/public': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) {
      proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
    }
  }
}));

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date().toISOString(),
    service: 'gateway-service',
    gateway: 'healthy'
  });
});

app.use('/kurobank/**', authMiddleware);

app.use('/kurobank/accounts/**', 
  (req, res, next) => {
    if (!req.user.roles.includes('ACCOUNTS')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'ACCOUNTS role required',
        timestamp: new Date().toISOString()
      });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.ACCOUNTS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/accounts': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.correlationId) {
        proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
      }
    }
  })
);

app.use('/kurobank/cards/**',
  (req, res, next) => {
    if (!req.user.roles.includes('CARDS')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'CARDS role required',
        timestamp: new Date().toISOString()
      });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.CARDS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/cards': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.correlationId) {
        proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
      }
    }
  })
);

app.use('/kurobank/loans/**',
  (req, res, next) => {
    if (!req.user.roles.includes('LOANS')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'LOANS role required',
        timestamp: new Date().toISOString()
      });
    }
    next();
  },
  createProxyMiddleware({
    target: process.env.LOANS_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/loans': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.correlationId) {
        proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
      }
    }
  })
);

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

module.exports = app;
