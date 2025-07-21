const AccountsService = require('../services/accountsService');
const CustomersService = require('../services/customersService');
const { ACCOUNTS_CONSTANTS } = require('../../../../shared/utils/constants');
const logger = require('../../../../shared/utils/logger');

const accountsService = new AccountsService();
const customersService = new CustomersService();

module.exports = {
  createAccount: async (c, req, res) => {
    try {
      const customerDto = c.request.requestBody;
      await accountsService.createAccount(customerDto);
      return res.status(201).json({
        statusCode: ACCOUNTS_CONSTANTS.STATUS_201,
        statusMsg: ACCOUNTS_CONSTANTS.MESSAGE_201
      });
    } catch (error) {
      logger.error('Error creating account:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  fetchAccount: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      logger.debug('fetchAccount method start');
      const customerDto = await accountsService.fetchAccount(mobileNumber);
      logger.debug('fetchAccount method end');
      return res.status(200).json(customerDto);
    } catch (error) {
      logger.error('Error fetching account:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  updateAccount: async (c, req, res) => {
    try {
      const customerDto = c.request.requestBody;
      const isUpdated = await accountsService.updateAccount(customerDto);
      if (isUpdated) {
        return res.status(200).json({
          statusCode: ACCOUNTS_CONSTANTS.STATUS_200,
          statusMsg: ACCOUNTS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: ACCOUNTS_CONSTANTS.STATUS_417,
          statusMsg: ACCOUNTS_CONSTANTS.MESSAGE_417_UPDATE
        });
      }
    } catch (error) {
      logger.error('Error updating account:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  deleteAccount: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const isDeleted = await accountsService.deleteAccount(mobileNumber);
      if (isDeleted) {
        return res.status(200).json({
          statusCode: ACCOUNTS_CONSTANTS.STATUS_200,
          statusMsg: ACCOUNTS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: ACCOUNTS_CONSTANTS.STATUS_417,
          statusMsg: ACCOUNTS_CONSTANTS.MESSAGE_417_DELETE
        });
      }
    } catch (error) {
      logger.error('Error deleting account:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  fetchCustomerDetails: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const correlationId = c.request.headers['kurobank-correlation-id'];
      logger.debug('fetchCustomerDetails method start');
      const customerDetailsDto = await customersService.fetchCustomerDetails(mobileNumber, correlationId);
      logger.debug('fetchCustomerDetails method end');
      return res.status(200).json(customerDetailsDto);
    } catch (error) {
      logger.error('Error fetching customer details:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  getBuildInfo: async (c, req, res) => {
    return res.status(200).json({
      version: process.env.BUILD_VERSION || '1.0.0',
      timestamp: new Date().toISOString()
    });
  },

  getContactInfo: async (c, req, res) => {
    return res.status(200).json({
      name: 'Kuro Bytes - Accounts Service',
      email: 'support@kurobytes.com',
      onCallSupport: '+1-555-ACCOUNTS'
    });
  },

  healthCheck: async (c, req, res) => {
    return res.status(200).json({ 
      status: 'UP', 
      timestamp: new Date().toISOString(),
      service: 'accounts-service'
    });
  },

  notFound: (c, req, res) => {
    return res.status(404).json({ 
      error: 'Not found',
      apiPath: req.url,
      errorTime: new Date().toISOString()
    });
  },

  validationFail: (c, req, res) => {
    return res.status(400).json({ 
      error: 'Validation error',
      apiPath: req.url,
      errorTime: new Date().toISOString()
    });
  }
};
