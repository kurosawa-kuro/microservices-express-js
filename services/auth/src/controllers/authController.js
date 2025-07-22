const AuthService = require('../services/authService');
const { AUTH_CONSTANTS } = require('../../../../shared/utils/constants');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const authService = new AuthService();

module.exports = {
  verifyToken: async (c, req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header'
        });
      }

      const token = authHeader.substring(7);
      const user = await authService.verifyToken(token);
      
      return res.standardResponse({
        valid: true,
        user: user
      }, 200, 'Token verification successful');
    } catch (error) {
      logger.error('Token verification failed:', { error: error.message, correlationId: req.correlationId });
      return res.status(401).json({
        valid: false,
        error: 'Invalid token'
      });
    }
  },

  refreshToken: async (c, req, res) => {
    try {
      const { refreshToken } = c.request.requestBody;
      const tokens = await authService.refreshToken(refreshToken);
      
      return res.standardResponse(tokens, 200, 'Token refreshed successfully');
    } catch (error) {
      logger.error('Token refresh failed:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(401, 'UNAUTHORIZED', 'Token refresh failed', req.url);
      return res.status(401).json(errorResponse);
    }
  },

  revokeToken: async (c, req, res) => {
    try {
      const { token } = c.request.requestBody;
      await authService.revokeToken(token);
      
      return res.standardResponse(null, 200, 'Token revoked successfully');
    } catch (error) {
      logger.error('Token revocation failed:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Token revocation failed', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getUserRoles: async (c, req, res) => {
    try {
      const { userId } = c.request.params;
      const roles = await authService.getUserRoles(userId);
      
      return res.standardResponse({ roles }, 200, 'User roles retrieved successfully');
    } catch (error) {
      logger.error('Get user roles failed:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to get user roles', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  assignRole: async (c, req, res) => {
    try {
      const { userId, roleId } = c.request.requestBody;
      await authService.assignRole(userId, roleId);
      
      return res.standardResponse(null, 200, 'Role assigned successfully');
    } catch (error) {
      logger.error('Role assignment failed:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Role assignment failed', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  removeRole: async (c, req, res) => {
    try {
      const { userId, roleId } = c.request.requestBody;
      await authService.removeRole(userId, roleId);
      
      return res.standardResponse(null, 200, 'Role removed successfully');
    } catch (error) {
      logger.error('Role removal failed:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Role removal failed', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
