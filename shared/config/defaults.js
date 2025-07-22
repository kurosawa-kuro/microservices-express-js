/**
 * Default configuration values for Cloud-Shop microservices
 */

const defaults = {
  // Server Configuration
  server: {
    port: 8080,
    host: '0.0.0.0',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    }
  },

  // Database Configuration
  database: {
    connectionLimit: 10,
    poolTimeout: 10000,
    schemaCacheSize: 1000,
    logQueries: process.env.NODE_ENV === 'development'
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    timestamp: true
  },

  // Security Configuration
  security: {
    helmet: {
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    }
  },

  // Kafka Configuration
  kafka: {
    clientId: 'cloud-shop-service',
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  },

  // Cache Configuration
  cache: {
    ttl: 300, // 5 minutes
    checkperiod: 600, // 10 minutes
    maxKeys: 1000
  },

  // Health Check Configuration
  health: {
    path: '/actuator/health',
    timeout: 5000
  },

  // Service-specific defaults
  services: {
    auth: {
      port: 3001,
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: '24h'
    },
    users: {
      port: 3002
    },
    gateway: {
      port: 3000,
      timeout: 30000
    },
    products: {
      port: 3003
    },
    cart: {
      port: 3004
    },
    orders: {
      port: 3005
    },
    message: {
      port: 3006
    }
  }
};

module.exports = defaults; 