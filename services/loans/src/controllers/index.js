const LoansService = require('../services/loansService');
const { LOANS_CONSTANTS } = require('../../../shared/utils/constants');
const logger = require('../../../shared/utils/logger');

const loansService = new LoansService();

module.exports = {
  createLoan: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      await loansService.createLoan(mobileNumber);
      return res.status(201).json({
        statusCode: LOANS_CONSTANTS.STATUS_201,
        statusMsg: LOANS_CONSTANTS.MESSAGE_201
      });
    } catch (error) {
      logger.error('Error creating loan:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  fetchLoan: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      logger.debug('fetchLoan method start');
      const loansDto = await loansService.fetchLoan(mobileNumber);
      logger.debug('fetchLoan method end');
      return res.status(200).json(loansDto);
    } catch (error) {
      logger.error('Error fetching loan:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  updateLoan: async (c, req, res) => {
    try {
      const loansDto = c.request.requestBody;
      const isUpdated = await loansService.updateLoan(loansDto);
      if (isUpdated) {
        return res.status(200).json({
          statusCode: LOANS_CONSTANTS.STATUS_200,
          statusMsg: LOANS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: LOANS_CONSTANTS.STATUS_417,
          statusMsg: LOANS_CONSTANTS.MESSAGE_417_UPDATE
        });
      }
    } catch (error) {
      logger.error('Error updating loan:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  deleteLoan: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const isDeleted = await loansService.deleteLoan(mobileNumber);
      if (isDeleted) {
        return res.status(200).json({
          statusCode: LOANS_CONSTANTS.STATUS_200,
          statusMsg: LOANS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: LOANS_CONSTANTS.STATUS_417,
          statusMsg: LOANS_CONSTANTS.MESSAGE_417_DELETE
        });
      }
    } catch (error) {
      logger.error('Error deleting loan:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

};
