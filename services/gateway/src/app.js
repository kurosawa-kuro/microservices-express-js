const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createProxyMiddleware } = require('http-proxy-middleware');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const correlationId = require('../../../shared/middleware/correlationId');
const createTimeoutMiddleware = require('../../../shared/middleware/timeoutMiddleware');
const { errorHandler } = require('../../../shared/middleware/errorHandler');
const { requireRole } = require('../../../shared/middleware/roleMiddleware');
const { authRateLimit, generalRateLimit } = require('./middleware/rateLimitMiddleware');
const logger = require('../../../shared/utils/logger');
const createHealthCheckHandler = require('../../../shared/utils/healthCheckUtility');

dotenv.config();

const healthCheckHandler = createHealthCheckHandler('gateway-service');

const openApiSpec = YAML.load(fs.readFileSync(path.join(__dirname, '../openapi.yaml'), 'utf8'));

const app = express();

app.use(helmet());
app.use(createTimeoutMiddleware(60000)); // 60 seconds for gateway
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'kurobank-correlation-id']
}));

app.use(express.json());
app.use(correlationId);
app.use(generalRateLimit);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get('/actuator/health', healthCheckHandler);

app.use('/public/**', createProxyMiddleware({
  target: process.env.USERS_SERVICE_URL || 'http://localhost:8082',
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

app.use('/kurobank/auth/**', createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:8081',
  changeOrigin: true,
  pathRewrite: {
    '^/kurobank/auth': '/kurobank/auth'
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) {
      proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
    }
  }
}));

app.use('/kurobank/users/**', createProxyMiddleware({
  target: process.env.USERS_SERVICE_URL || 'http://localhost:8082',
  changeOrigin: true,
  pathRewrite: {
    '^/kurobank/users': '/kurobank/users'
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) {
      proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
    }
  }
}));

app.use('/kurobank/accounts/**', 
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
  createProxyMiddleware({
    target: process.env.USERS_SERVICE_URL || 'http://localhost:8082',
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/accounts': '/kurobank/users/accounts'
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
    target: process.env.CARDS_SERVICE_URL || 'http://localhost:9000',
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
    target: process.env.LOANS_SERVICE_URL || 'http://localhost:8090',
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

app.use('/kurobank/products/**', createProxyMiddleware({
  target: process.env.PRODUCTS_SERVICE_URL || 'http://localhost:8083',
  changeOrigin: true,
  pathRewrite: {
    '^/kurobank/products': '/api'
  },
  onProxyReq: (proxyReq, req, res) => {
    if (req.correlationId) {
      proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
    }
  }
}));

app.use('/kurobank/cart/**',
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
  createProxyMiddleware({
    target: process.env.CART_SERVICE_URL || 'http://localhost:8084',
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/cart': '/api'
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.correlationId) {
        proxyReq.setHeader('kurobank-correlation-id', req.correlationId);
      }
    }
  })
);

app.use('/kurobank/orders/**',
  requireRole(['bank-customer', 'bank-employee', 'bank-admin']),
  createProxyMiddleware({
    target: process.env.ORDERS_SERVICE_URL || 'http://localhost:8085',
    changeOrigin: true,
    pathRewrite: {
      '^/kurobank/orders': '/api'
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
