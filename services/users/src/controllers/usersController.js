const UsersService = require('../services/usersService');
const { USERS_CONSTANTS } = require('../../../../shared/utils/constants');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const usersService = new UsersService();

module.exports = {
  createUser: async (c, req, res) => {
    try {
      const userDto = c.request.requestBody;
      const user = await usersService.createUser(userDto);
      return res.status(201).json(user);
    } catch (error) {
      logger.error('Error creating user:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create user', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getUser: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      const user = await usersService.getUser(id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      return res.status(200).json(user);
    } catch (error) {
      logger.error('Error fetching user:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch user', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getUserByMobile: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const user = await usersService.getUserByMobile(mobileNumber);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      return res.status(200).json(user);
    } catch (error) {
      logger.error('Error fetching user by mobile:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch user', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  updateUser: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      const userDto = c.request.requestBody;
      const user = await usersService.updateUser(id, userDto);
      return res.status(200).json(user);
    } catch (error) {
      logger.error('Error updating user:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update user', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  deleteUser: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      await usersService.deleteUser(id);
      return res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting user:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete user', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getUserDetails: async (c, req, res) => {
    try {
      const { id } = c.request.params;
      const correlationId = c.request.headers['kurobank-correlation-id'];
      const userDetails = await usersService.getUserDetails(id, correlationId);
      return res.status(200).json(userDetails);
    } catch (error) {
      logger.error('Error fetching user details:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch user details', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
