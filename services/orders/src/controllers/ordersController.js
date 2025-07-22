const OrdersService = require('../services/ordersService');

const ordersService = new OrdersService();

module.exports = {
  createOrder: async (c, req, res, next) => {
    const { userId, shippingAddress } = c.request.requestBody;
    const order = await ordersService.createOrder(userId, { shippingAddress });
    return res.status(201).json(order);
  },

  getOrder: async (c, req, res, next) => {
    const { orderId } = c.request.params;
    const { userId } = c.request.query;
    const order = await ordersService.getOrder(orderId, userId);
    if (!order) {
      const error = new Error('Order not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(order);
  },

  updateOrderStatus: async (c, req, res, next) => {
    const { orderId } = c.request.params;
    const { status, userId } = c.request.requestBody;
    const order = await ordersService.updateOrderStatus(orderId, status, userId);
    return res.status(200).json(order);
  },

  getOrderHistory: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const { page, limit } = c.request.query;
    const result = await ordersService.getOrderHistory(userId, page, limit);
    return res.status(200).json(result);
  },

  getAllOrders: async (c, req, res, next) => {
    const { page, limit, status } = c.request.query;
    const result = await ordersService.getAllOrders(page, limit, status);
    return res.status(200).json(result);
  },

  cancelOrder: async (c, req, res, next) => {
    const { orderId } = c.request.params;
    const { userId } = c.request.requestBody;
    const order = await ordersService.cancelOrder(orderId, userId);
    return res.status(200).json(order);
  }
};
