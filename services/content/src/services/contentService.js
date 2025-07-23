const prisma = require('../prismaClient');
const logger = require('../../../../shared/utils/logger');

class ContentService {
  constructor() {
    this.prisma = prisma;
  }

  async createTopPageDisplay(topPageDisplayDto) {
    const topPageDisplay = await this.prisma.topPageDisplay.create({
      data: {
        displayType: topPageDisplayDto.displayType,
        productId: topPageDisplayDto.productId,
        productName: topPageDisplayDto.productName,
        productPrice: topPageDisplayDto.productPrice,
        rating: topPageDisplayDto.rating,
        image: topPageDisplayDto.image,
        categoryId: topPageDisplayDto.categoryId,
        categoryName: topPageDisplayDto.categoryName,
        priority: topPageDisplayDto.priority,
        specialPrice: topPageDisplayDto.specialPrice,
        startDate: topPageDisplayDto.startDate,
        endDate: topPageDisplayDto.endDate,
        isActive: topPageDisplayDto.isActive
      }
    });

    return topPageDisplay;
  }

  async getTopPageDisplay(id) {
    return await this.prisma.topPageDisplay.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async updateTopPageDisplay(id, topPageDisplayDto) {
    return await this.prisma.topPageDisplay.update({
      where: { id: parseInt(id) },
      data: {
        displayType: topPageDisplayDto.displayType,
        productId: topPageDisplayDto.productId,
        productName: topPageDisplayDto.productName,
        productPrice: topPageDisplayDto.productPrice,
        rating: topPageDisplayDto.rating,
        image: topPageDisplayDto.image,
        categoryId: topPageDisplayDto.categoryId,
        categoryName: topPageDisplayDto.categoryName,
        priority: topPageDisplayDto.priority,
        specialPrice: topPageDisplayDto.specialPrice,
        startDate: topPageDisplayDto.startDate,
        endDate: topPageDisplayDto.endDate,
        isActive: topPageDisplayDto.isActive
      }
    });
  }

  async deleteTopPageDisplay(id) {
    await this.prisma.topPageDisplay.delete({
      where: { id: parseInt(id) }
    });
  }

  async getTopPageDisplays(searchParams = {}) {
    const { displayType, isActive, page = 1, limit = 10 } = searchParams;
    const skip = (page - 1) * limit;

    const where = {};
    if (displayType) {
      where.displayType = displayType;
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [topPageDisplays, total] = await Promise.all([
      this.prisma.topPageDisplay.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      this.prisma.topPageDisplay.count({
        where
      })
    ]);

    return {
      topPageDisplays,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getActiveTopPageDisplays(options = {}) {
    const { displayType, page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      OR: [
        { endDate: null },
        { endDate: { gte: new Date() } }
      ]
    };

    if (displayType) {
      where.displayType = displayType;
    }

    const [topPageDisplays, total] = await Promise.all([
      this.prisma.topPageDisplay.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { startDate: 'desc' }
        ],
        skip,
        take: limit
      }),
      this.prisma.topPageDisplay.count({
        where
      })
    ]);

    return {
      topPageDisplays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async toggleTopPageDisplayStatus(id) {
    const topPageDisplay = await this.getTopPageDisplay(id);
    if (!topPageDisplay) {
      throw new Error('TopPageDisplay not found');
    }

    return await this.prisma.topPageDisplay.update({
      where: { id: parseInt(id) },
      data: {
        isActive: !topPageDisplay.isActive
      }
    });
  }
}

module.exports = ContentService;
