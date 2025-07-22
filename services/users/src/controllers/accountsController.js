const AccountsService = require('../services/accountsService');
const { ACCOUNTS_CONSTANTS } = require('../../../../shared/utils/constants');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const accountsService = new AccountsService();

module.exports = {
  createAccount: async (c, req, res) => {
    try {
      const accountDto = c.request.requestBody;
      const account = await accountsService.createAccount(accountDto);
      return res.status(201).json(account);
    } catch (error) {
      logger.error('Error creating account:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create account', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getAccount: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const account = await accountsService.getAccountByMobile(mobileNumber);
      if (!account) {
        return res.status(404).json({
          error: 'Account not found'
        });
      }
      return res.status(200).json(account);
    } catch (error) {
      logger.error('Error fetching account:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch account', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  updateAccount: async (c, req, res) => {
    try {
      const accountDto = c.request.requestBody;
      const account = await accountsService.updateAccount(accountDto);
      return res.status(200).json(account);
    } catch (error) {
      logger.error('Error updating account:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update account', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  deleteAccount: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      await accountsService.deleteAccount(mobileNumber);
      return res.status(200).json({
        message: 'Account deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting account:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to delete account', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
