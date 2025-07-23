const { PrismaClient } = require('@prisma/client');
const logger = require('../../../../shared/utils/logger');
const axios = require('axios');
const KafkaProducer = require('../kafka/kafkaProducer');

class OrdersService {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    this.cartServiceUrl = process.env.CART_SERVICE_URL || 'http://cart-service:8084';
    this.productsServiceUrl = process.env.PRODUCTS_SERVICE_URL || 'http://products-service:8083';
    this.kafkaProducer = new KafkaProducer();
  }

  async createOrder(userId, orderData) {
    try {
      const { shippingAddress } = orderData;
      
      const cartData = await this.getCartData(userId);
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        throw new Error('Cart is empty');
      }

      const orderItems = cartData.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.productPrice,
        productName: item.productName,
        productImage: item.productImage
      }));

      const totalAmount = cartData.summary.totalAmount;

      const order = await this.prisma.order.create({
        data: {
          userId: userId,
          totalAmount: totalAmount,
          status: 'PENDING',
          shippingAddress: shippingAddress,
          orderItems: {
            create: orderItems
          }
        },
        include: {
          orderItems: true
        }
      });

      await this.clearUserCart(userId);

      await this.kafkaProducer.publishOrderEvent('ORDER_CREATED', order);
      
      await this.kafkaProducer.publishInventoryEvent(order.id, order.orderItems);
      
      await this.kafkaProducer.publishPaymentEvent(order.id, {
        amount: totalAmount,
        paymentMethod: 'credit_card'
      });

      logger.info('Order created successfully', { 
        orderId: order.id, 
        userId, 
        totalAmount,
        itemCount: orderItems.length 
      });
      return order;
    } catch (error) {
      logger.error('Error creating order:', { error: error.message, userId });
      throw error;
    }
  }

  async getOrder(orderId, userId = null) {
    try {
      const where = { id: parseInt(orderId) };
      if (userId) {
        where.userId = userId;
      }

      const order = await this.prisma.order.findUnique({
        where,
        include: {
          orderItems: true
        }
      });

      if (order) {
        logger.info('Order retrieved successfully', { orderId });
      }
      return order;
    } catch (error) {
      logger.error('Error retrieving order:', { error: error.message, orderId });
      throw error;
    }
  }

  async updateOrderStatus(orderId, status, userId = null, options = {}) {
    try {
      const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid order status');
      }

      const where = { id: parseInt(orderId) };
      if (userId) {
        where.userId = userId;
      }

      // 現在のステータスを取得して重複更新を防止
      const currentOrder = await this.prisma.order.findUnique({
        where,
        select: { status: true }
      });

      if (currentOrder && currentOrder.status === status) {
        logger.info('Order status unchanged, skipping update', { orderId, status });
        return await this.getOrder(orderId, userId);
      }

      const order = await this.prisma.order.update({
        where,
        data: { status },
        include: {
          orderItems: true
        }
      });

      // Kafkaイベントからの呼び出しの場合はイベント発行をスキップして循環参照を防止
      if (!options.fromKafkaEvent && !options.skipEventPublish) {
        await this.kafkaProducer.publishOrderEvent('ORDER_STATUS_UPDATED', order);
      }

      logger.info('Order status updated successfully', { 
        orderId, 
        status, 
        fromKafkaEvent: options.fromKafkaEvent,
        skipEventPublish: options.skipEventPublish
      });
      return order;
    } catch (error) {
      logger.error('Error updating order status:', { error: error.message, orderId, status });
      throw error;
    }
  }

  async getOrderHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const orders = await this.prisma.order.findMany({
        where: { userId: userId },
        include: {
          orderItems: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { orderedAt: 'desc' }
      });

      const total = await this.prisma.order.count({
        where: { userId: userId }
      });

      logger.info('Order history retrieved successfully', { 
        userId, 
        count: orders.length, 
        total 
      });

      return {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error retrieving order history:', { error: error.message, userId });
      throw error;
    }
  }

  async getAllOrders(page = 1, limit = 10, status = null) {
    try {
      const skip = (page - 1) * limit;
      const where = {};
      
      if (status) {
        where.status = status;
      }

      const orders = await this.prisma.order.findMany({
        where,
        include: {
          orderItems: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { orderedAt: 'desc' }
      });

      const total = await this.prisma.order.count({ where });

      logger.info('All orders retrieved successfully', { 
        count: orders.length, 
        total, 
        status 
      });

      return {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error retrieving all orders:', { error: error.message });
      throw error;
    }
  }

  async cancelOrder(orderId, userId = null) {
    try {
      const where = { id: parseInt(orderId) };
      if (userId) {
        where.userId = userId;
      }

      const existingOrder = await this.prisma.order.findUnique({
        where
      });

      if (!existingOrder) {
        throw new Error('Order not found');
      }

      if (existingOrder.status === 'DELIVERED' || existingOrder.status === 'CANCELLED') {
        throw new Error('Cannot cancel order in current status');
      }

      const order = await this.prisma.order.update({
        where,
        data: { status: 'CANCELLED' },
        include: {
          orderItems: true
        }
      });

      await this.kafkaProducer.publishOrderEvent('ORDER_CANCELLED', order);

      logger.info('Order cancelled successfully', { orderId });
      return order;
    } catch (error) {
      logger.error('Error cancelling order:', { error: error.message, orderId });
      throw error;
    }
  }

  async getCartData(userId) {
    try {
      const response = await axios.get(`${this.cartServiceUrl}/api/cart/${userId}`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching cart data:', { 
        error: error.message, 
        userId, 
        serviceUrl: this.cartServiceUrl 
      });
      throw new Error('Failed to fetch cart data');
    }
  }

  async clearUserCart(userId) {
    try {
      await axios.delete(`${this.cartServiceUrl}/api/cart/${userId}`, {
        timeout: 5000
      });
      logger.info('User cart cleared after order creation', { userId });
    } catch (error) {
      logger.warn('Failed to clear user cart after order creation', { 
        error: error.message, 
        userId 
      });
    }
  }

  async disconnect() {
    await this.kafkaProducer.disconnect();
    await this.prisma.$disconnect();
  }
}

module.exports = OrdersService;
