const OrdersService = require('../services/ordersService');
const { createStandardError } = require('../../../../shared/middleware/errorHandler');
const logger = require('../../../../shared/utils/logger');

const ordersService = new OrdersService();

module.exports = {
  createOrder: async (c, req, res) => {
    try {
      const { userId, shippingAddress } = c.request.requestBody;
      const order = await ordersService.createOrder(userId, { shippingAddress });
      return res.status(201).json(order);
    } catch (error) {
      logger.error('Error creating order:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Cart is empty') {
        const errorResponse = createStandardError(400, 'CART_EMPTY', 'Cart is empty', req.url);
        return res.status(400).json(errorResponse);
      }
      if (error.message === 'Failed to fetch cart data') {
        const errorResponse = createStandardError(503, 'SERVICE_UNAVAILABLE', 'Cart service unavailable', req.url);
        return res.status(503).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to create order', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getOrder: async (c, req, res) => {
    try {
      const { orderId } = c.request.params;
      const { userId } = c.request.query;
      const order = await ordersService.getOrder(orderId, userId);
      if (!order) {
        return res.status(404).json({
          error: 'Order not found'
        });
      }
      return res.status(200).json(order);
    } catch (error) {
      logger.error('Error fetching order:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch order', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  updateOrderStatus: async (c, req, res) => {
    try {
      const { orderId } = c.request.params;
      const { status, userId } = c.request.requestBody;
      const order = await ordersService.updateOrderStatus(orderId, status, userId);
      return res.status(200).json(order);
    } catch (error) {
      logger.error('Error updating order status:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Invalid order status') {
        const errorResponse = createStandardError(400, 'INVALID_STATUS', 'Invalid order status', req.url);
        return res.status(400).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to update order status', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getOrderHistory: async (c, req, res) => {
    try {
      const { userId } = c.request.params;
      const { page, limit } = c.request.query;
      const result = await ordersService.getOrderHistory(userId, page, limit);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error fetching order history:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch order history', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  getAllOrders: async (c, req, res) => {
    try {
      const { page, limit, status } = c.request.query;
      const result = await ordersService.getAllOrders(page, limit, status);
      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error fetching all orders:', { error: error.message, correlationId: req.correlationId });
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to fetch orders', req.url);
      return res.status(500).json(errorResponse);
    }
  },

  cancelOrder: async (c, req, res) => {
    try {
      const { orderId } = c.request.params;
      const { userId } = c.request.requestBody;
      const order = await ordersService.cancelOrder(orderId, userId);
      return res.status(200).json(order);
    } catch (error) {
      logger.error('Error cancelling order:', { error: error.message, correlationId: req.correlationId });
      if (error.message === 'Order not found') {
        const errorResponse = createStandardError(404, 'ORDER_NOT_FOUND', 'Order not found', req.url);
        return res.status(404).json(errorResponse);
      }
      if (error.message === 'Cannot cancel order in current status') {
        const errorResponse = createStandardError(400, 'INVALID_OPERATION', 'Cannot cancel order in current status', req.url);
        return res.status(400).json(errorResponse);
      }
      const errorResponse = createStandardError(500, 'INTERNAL_SERVER_ERROR', 'Failed to cancel order', req.url);
      return res.status(500).json(errorResponse);
    }
  }
};
