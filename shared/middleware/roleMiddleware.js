const logger = require('../utils/logger');

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.authFailure('User not authenticated for role check', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.accessDenied(req.user, requiredRoles, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    logger.debug(`Access granted for user ${req.user.preferred_username}`, {
      path: req.path,
      method: req.method,
      userRoles,
      requiredRoles,
      correlationId: req.correlationId
    });

    next();
  };
};

module.exports = { requireRole };
