const AnalyticsService = require('../services/analyticsService');

const analyticsService = new AnalyticsService();

module.exports = {
  createViewHistory: async (c, req, res, next) => {
    try {
      const viewHistoryDto = c.request.requestBody;
      const viewHistory = await analyticsService.createViewHistory(viewHistoryDto);
      return res.status(201).json(viewHistory);
    } catch (error) {
      next(error);
    }
  },

  getViewHistory: async (c, req, res, next) => {
    try {
      const { id } = c.request.params;
      const viewHistory = await analyticsService.getViewHistory(id);
      if (!viewHistory) {
        const error = new Error('View history not found');
        error.statusCode = 404;
        throw error;
      }
      return res.status(200).json(viewHistory);
    } catch (error) {
      next(error);
    }
  },

  getUserViewHistory: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const { page = 1, limit = 10 } = c.request.query;
    const result = await analyticsService.getUserViewHistory(userId, { page: parseInt(page), limit: parseInt(limit) });
    return res.status(200).json(result);
  },

  createUserActionLog: async (c, req, res, next) => {
    try {
      const actionLogDto = c.request.requestBody;
      const actionLog = await analyticsService.createUserActionLog(actionLogDto);
      return res.status(201).json(actionLog);
    } catch (error) {
      next(error);
    }
  },

  getUserActionLogs: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const { actionType, page = 1, limit = 10 } = c.request.query;
    const result = await analyticsService.getUserActionLogs(userId, { actionType, page: parseInt(page), limit: parseInt(limit) });
    return res.status(200).json(result);
  },

  getActionLogsByType: async (c, req, res, next) => {
    const { actionType } = c.request.params;
    const { page = 1, limit = 10 } = c.request.query;
    const result = await analyticsService.getActionLogsByType(actionType, { page: parseInt(page), limit: parseInt(limit) });
    return res.status(200).json(result);
  },

  deleteViewHistory: async (c, req, res, next) => {
    const { id } = c.request.params;
    await analyticsService.deleteViewHistory(id);
    return res.status(200).json({
      message: 'View history deleted successfully'
    });
  }
};
