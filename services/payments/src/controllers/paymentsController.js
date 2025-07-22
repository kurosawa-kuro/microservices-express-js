const PaymentsService = require('../services/paymentsService');

const paymentsService = new PaymentsService();

module.exports = {
  processPayment: async (c, req, res, next) => {
    const { orderId, userId, amount, currency, paymentMethod, paymentDetails } = c.request.requestBody;
    const payment = await paymentsService.processPayment({
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentDetails
    });
    return res.status(201).json(payment);
  },

  getPayment: async (c, req, res, next) => {
    const { paymentId } = c.request.params;
    const payment = await paymentsService.getPayment(paymentId);
    if (!payment) {
      const error = new Error('Payment not found');
      error.statusCode = 404;
      throw error;
    }
    return res.status(200).json(payment);
  },

  refundPayment: async (c, req, res, next) => {
    const { paymentId } = c.request.params;
    const { amount, reason } = c.request.requestBody;
    const refund = await paymentsService.refundPayment(paymentId, amount, reason);
    return res.status(201).json(refund);
  },

  getPaymentHistory: async (c, req, res, next) => {
    const { userId } = c.request.params;
    const { page, limit } = c.request.query;
    const result = await paymentsService.getPaymentHistory(userId, page, limit);
    return res.status(200).json(result);
  }
};
