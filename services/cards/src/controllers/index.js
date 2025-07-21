const CardsService = require('../services/cardsService');
const { CARDS_CONSTANTS } = require('../../../../shared/utils/constants');
const logger = require('../../../../shared/utils/logger');

const cardsService = new CardsService();

module.exports = {
  createCard: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      await cardsService.createCard(mobileNumber);
      return res.status(201).json({
        statusCode: CARDS_CONSTANTS.STATUS_201,
        statusMsg: CARDS_CONSTANTS.MESSAGE_201
      });
    } catch (error) {
      logger.error('Error creating card:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  fetchCard: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      logger.debug('fetchCard method start');
      const cardsDto = await cardsService.fetchCard(mobileNumber);
      logger.debug('fetchCard method end');
      return res.status(200).json(cardsDto);
    } catch (error) {
      logger.error('Error fetching card:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  updateCard: async (c, req, res) => {
    try {
      const cardsDto = c.request.requestBody;
      const isUpdated = await cardsService.updateCard(cardsDto);
      if (isUpdated) {
        return res.status(200).json({
          statusCode: CARDS_CONSTANTS.STATUS_200,
          statusMsg: CARDS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: CARDS_CONSTANTS.STATUS_417,
          statusMsg: CARDS_CONSTANTS.MESSAGE_417_UPDATE
        });
      }
    } catch (error) {
      logger.error('Error updating card:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

  deleteCard: async (c, req, res) => {
    try {
      const { mobileNumber } = c.request.query;
      const isDeleted = await cardsService.deleteCard(mobileNumber);
      if (isDeleted) {
        return res.status(200).json({
          statusCode: CARDS_CONSTANTS.STATUS_200,
          statusMsg: CARDS_CONSTANTS.MESSAGE_200
        });
      } else {
        return res.status(417).json({
          statusCode: CARDS_CONSTANTS.STATUS_417,
          statusMsg: CARDS_CONSTANTS.MESSAGE_417_DELETE
        });
      }
    } catch (error) {
      logger.error('Error deleting card:', error);
      return res.status(500).json({
        apiPath: req.url,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: error.message,
        errorTime: new Date().toISOString()
      });
    }
  },

};
