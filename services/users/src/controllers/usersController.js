const UsersService = require('../services/usersService');
const { USERS_CONSTANTS } = require('../../../../shared/utils/constants');

const usersService = new UsersService();

module.exports = {
  createUser: async (c, req, res, next) => {
    const userDto = c.request.requestBody;
    const user = await usersService.createUser(userDto);
    return res.status(201).json(user);
  },

  getUser: async (c, req, res, next) => {
    const { id } = c.request.params;
    const user = await usersService.getUser(id);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(user);
  },

  getUserByMobile: async (c, req, res, next) => {
    const { mobileNumber } = c.request.query;
    const user = await usersService.getUserByMobile(mobileNumber);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(user);
  },

  updateUser: async (c, req, res, next) => {
    const { id } = c.request.params;
    const userDto = c.request.requestBody;
    const user = await usersService.updateUser(id, userDto);
    return res.status(200).json(user);
  },

  deleteUser: async (c, req, res, next) => {
    const { id } = c.request.params;
    await usersService.deleteUser(id);
    return res.status(200).json({
      message: 'User deleted successfully'
    });
  },

  getUserDetails: async (c, req, res, next) => {
    const { id } = c.request.params;
    const correlationId = c.request.headers['cloud-shop-correlation-id'];
    const userDetails = await usersService.getUserDetails(id, correlationId);
    return res.status(200).json(userDetails);
  }
};
