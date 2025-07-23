const { getAnalyticsClient } = require('../../../../shared/database/prismaClient');
const logger = require('../../../../shared/utils/logger');

class AnalyticsService {
  constructor() {
    this.prisma = getAnalyticsClient();
  }

  async createViewHistory(viewHistoryDto) {
    const viewHistory = await this.prisma.viewHistory.create({
      data: {
        userId: viewHistoryDto.userId,
        productId: viewHistoryDto.productId,
        productName: viewHistoryDto.productName,
        productPrice: viewHistoryDto.productPrice,
        categoryId: viewHistoryDto.categoryId,
        categoryName: viewHistoryDto.categoryName
      }
    });

    return viewHistory;
  }

  async getViewHistory(id) {
    return await this.prisma.viewHistory.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async getUserViewHistory(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [viewHistory, total] = await Promise.all([
      this.prisma.viewHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.viewHistory.count({
        where: { userId }
      })
    ]);

    return {
      viewHistory,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createUserActionLog(actionLogDto) {
    const actionLog = await this.prisma.userActionLog.create({
      data: {
        requestID: actionLogDto.requestID,
        userId: actionLogDto.userId,
        actionType: actionLogDto.actionType,
        productId: actionLogDto.productId,
        productName: actionLogDto.productName,
        productPrice: actionLogDto.productPrice,
        categoryId: actionLogDto.categoryId,
        categoryName: actionLogDto.categoryName,
        cartItemId: actionLogDto.cartItemId,
        orderId: actionLogDto.orderId,
        returnId: actionLogDto.returnId,
        quantity: actionLogDto.quantity,
        searchKeyword: actionLogDto.searchKeyword,
        searchCategoryId: actionLogDto.searchCategoryId,
        searchCategoryName: actionLogDto.searchCategoryName,
        reviewText: actionLogDto.reviewText,
        rating: actionLogDto.rating,
        actionReason: actionLogDto.actionReason,
        errorDetails: actionLogDto.errorDetails,
        metadata: actionLogDto.metadata
      }
    });

    return actionLog;
  }

  async getUserActionLogs(userId, options = {}) {
    const { actionType, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where = { userId };
    if (actionType) {
      where.actionType = actionType;
    }

    const [actionLogs, total] = await Promise.all([
      this.prisma.userActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.userActionLog.count({
        where
      })
    ]);

    return {
      actionLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getActionLogsByType(actionType, options = {}) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [actionLogs, total] = await Promise.all([
      this.prisma.userActionLog.findMany({
        where: { actionType },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.userActionLog.count({
        where: { actionType }
      })
    ]);

    return {
      actionLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async deleteViewHistory(id) {
    await this.prisma.viewHistory.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = AnalyticsService;
