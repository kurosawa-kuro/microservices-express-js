const logger = require('../utils/logger');

const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const userRoles = req.user.roles || [];
    const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn(`Access denied for user ${req.user.preferred_username}. Required roles: ${requiredRoles.join(', ')}, User roles: ${userRoles.join(', ')}`);
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
    }

    next();
  };
};

module.exports = { requireRole };
