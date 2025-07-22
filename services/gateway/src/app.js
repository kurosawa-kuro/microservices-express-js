const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createProxyMiddleware } = require('http-proxy-middleware');
const correlationId = require('../shared/middleware/correlationId');
const errorHandler = require('../shared/middleware/errorHandler');
const authMiddleware = require('./middleware/authMiddleware');
const { requireRole } = require('../shared/middleware/roleMiddleware');
const { authRateLimit, generalRateLimit } = require('./middleware/rateLimitMiddleware');
const tokenRefreshService = require('./services/tokenRefreshService');
const logger = require('../shared/utils/logger');
const createHealthCheckHandler = require('../shared/utils/healthCheckUtility');

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
app.use(generalRateLimit);

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

app.post('/auth/refresh', authRateLimit, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      logger.securityWarn('Token refresh attempted without refresh token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    const isValid = await tokenRefreshService.validateRefreshToken(refreshToken, req.correlationId);
    if (!isValid) {
      logger.securityWarn('Invalid refresh token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired refresh token',
        timestamp: new Date().toISOString()
      });
    }

    const result = await tokenRefreshService.refreshToken(refreshToken, req.correlationId);
    
    if (result.success) {
      res.status(200).json({
        message: 'Token refreshed successfully',
        data: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(result.error.status || 500).json({
        error: 'Token Refresh Failed',
        message: result.error.message,
        details: result.error.details,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.securityError('Token refresh endpoint error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      correlationId: req.correlationId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token refresh failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.post('/auth/revoke', authRateLimit, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Refresh token is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await tokenRefreshService.revokeRefreshToken(refreshToken, req.correlationId);
    
    if (result.success) {
      res.status(200).json({
        message: 'Token revoked successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        error: 'Token Revocation Failed',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.securityError('Token revocation endpoint error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      correlationId: req.correlationId
    });
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Token revocation failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/kurobank/**', authRateLimit, authMiddleware);

app.use('/kurobank/accounts/**', 
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
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
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
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
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
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
