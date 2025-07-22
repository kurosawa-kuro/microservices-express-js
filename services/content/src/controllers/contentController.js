const ContentService = require('../services/contentService');

const contentService = new ContentService();

module.exports = {
  createTopPageDisplay: async (c, req, res, next) => {
    const topPageDisplayDto = c.request.requestBody;
    const topPageDisplay = await contentService.createTopPageDisplay(topPageDisplayDto);
    return res.status(201).json(topPageDisplay);
  },

  getTopPageDisplay: async (c, req, res, next) => {
    const { id } = c.request.params;
    const topPageDisplay = await contentService.getTopPageDisplay(id);
    if (!topPageDisplay) {
      const error = new Error('TopPageDisplay not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(topPageDisplay);
  },

  updateTopPageDisplay: async (c, req, res, next) => {
    const { id } = c.request.params;
    const topPageDisplayDto = c.request.requestBody;
    const topPageDisplay = await contentService.updateTopPageDisplay(id, topPageDisplayDto);
    return res.status(200).json(topPageDisplay);
  },

  deleteTopPageDisplay: async (c, req, res, next) => {
    const { id } = c.request.params;
    await contentService.deleteTopPageDisplay(id);
    return res.status(200).json({
      message: 'TopPageDisplay deleted successfully'
    });
  },

  getTopPageDisplays: async (c, req, res, next) => {
    const searchParams = c.request.query;
    const result = await contentService.getTopPageDisplays(searchParams);
    return res.status(200).json(result);
  },

  getActiveTopPageDisplays: async (c, req, res, next) => {
    const { displayType, page = 1, limit = 10 } = c.request.query;
    const result = await contentService.getActiveTopPageDisplays({ displayType, page: parseInt(page), limit: parseInt(limit) });
    return res.status(200).json(result);
  },

  toggleTopPageDisplayStatus: async (c, req, res, next) => {
    const { id } = c.request.params;
    const topPageDisplay = await contentService.toggleTopPageDisplayStatus(id);
    return res.status(200).json(topPageDisplay);
  }
};
