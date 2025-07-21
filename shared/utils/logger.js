const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'kurobank' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.File({ filename: 'security.log', level: 'info' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

logger.securityInfo = (message, meta = {}) => {
  logger.info(message, { ...meta, securityEvent: true });
};

logger.securityWarn = (message, meta = {}) => {
  logger.warn(message, { ...meta, securityEvent: true });
};

logger.securityError = (message, meta = {}) => {
  logger.error(message, { ...meta, securityEvent: true });
};

logger.authSuccess = (user, meta = {}) => {
  logger.securityInfo('Authentication successful', { 
    ...meta, 
    userId: user.sub,
    username: user.preferred_username,
    roles: user.roles,
    securityEventType: 'auth_success'
  });
};

logger.authFailure = (reason, meta = {}) => {
  logger.securityWarn('Authentication failed', { 
    ...meta, 
    reason,
    securityEventType: 'auth_failure'
  });
};

logger.accessDenied = (user, requiredRoles, meta = {}) => {
  logger.securityWarn('Access denied', { 
    ...meta, 
    userId: user?.sub,
    username: user?.preferred_username,
    userRoles: user?.roles || [],
    requiredRoles,
    securityEventType: 'access_denied'
  });
};

logger.rateLimitExceeded = (ip, endpoint, meta = {}) => {
  logger.securityWarn('Rate limit exceeded', { 
    ...meta, 
    ip,
    endpoint,
    securityEventType: 'rate_limit_exceeded'
  });
};

logger.tokenRefresh = (user, meta = {}) => {
  logger.securityInfo('Token refreshed', { 
    ...meta, 
    userId: user.sub,
    username: user.preferred_username,
    securityEventType: 'token_refresh'
  });
};

logger.tokenCacheHit = (user, meta = {}) => {
  logger.debug('Token cache hit', { 
    ...meta, 
    userId: user.sub,
    username: user.preferred_username,
    securityEventType: 'token_cache_hit'
  });
};

logger.tokenCacheMiss = (meta = {}) => {
  logger.debug('Token cache miss', { 
    ...meta, 
    securityEventType: 'token_cache_miss'
  });
};

module.exports = logger;
