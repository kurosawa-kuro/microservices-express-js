const { PrismaClient } = require('@prisma/client');
const logger = require('../../../../shared/utils/logger');
const StripeService = require('./stripeService');
const KafkaProducer = require('../kafka/kafkaProducer');

class PaymentsService {
  constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
    this.stripeService = new StripeService();
    this.kafkaProducer = new KafkaProducer();
  }

  async processPayment(paymentData) {
    try {
      const { orderId, userId, amount, currency = 'JPY', paymentMethod, paymentDetails } = paymentData;

      const payment = await this.prisma.payment.create({
        data: {
          orderId,
          userId,
          amount,
          currency,
          paymentMethod,
          status: 'PENDING',
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null
        },
        include: {
          refunds: true
        }
      });

      try {
        const stripeResult = await this.stripeService.processPayment({
          amount,
          currency,
          paymentMethod,
          paymentDetails,
          paymentId: payment.id
        });

        const updatedPayment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: stripeResult.success ? 'COMPLETED' : 'FAILED',
            externalPaymentId: stripeResult.externalPaymentId,
            paymentIntentId: stripeResult.paymentIntentId,
            failureReason: stripeResult.failureReason,
            processedAt: new Date()
          },
          include: {
            refunds: true
          }
        });

        await this.kafkaProducer.publishPaymentEvent(
          stripeResult.success ? 'PAYMENT_COMPLETED' : 'PAYMENT_FAILED',
          updatedPayment
        );

        logger.info('Payment processed successfully', {
          paymentId: payment.id,
          orderId,
          userId,
          amount,
          status: updatedPayment.status
        });

        return updatedPayment;
      } catch (stripeError) {
        const failedPayment = await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: stripeError.message,
            processedAt: new Date()
          },
          include: {
            refunds: true
          }
        });

        await this.kafkaProducer.publishPaymentEvent('PAYMENT_FAILED', failedPayment);

        logger.error('Payment processing failed', {
          paymentId: payment.id,
          error: stripeError.message,
          orderId,
          userId
        });

        return failedPayment;
      }
    } catch (error) {
      logger.error('Error processing payment:', { error: error.message, paymentData });
      throw error;
    }
  }

  async getPayment(paymentId) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          refunds: true
        }
      });

      if (payment) {
        logger.info('Payment retrieved successfully', { paymentId });
      }
      return payment;
    } catch (error) {
      logger.error('Error retrieving payment:', { error: error.message, paymentId });
      throw error;
    }
  }

  async refundPayment(paymentId, amount, reason) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
        include: { refunds: true }
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'COMPLETED') {
        throw new Error('Cannot refund payment that is not completed');
      }

      const totalRefunded = payment.refunds
        .filter(r => r.status === 'COMPLETED')
        .reduce((sum, r) => sum + r.amount, 0);

      if (totalRefunded + amount > payment.amount) {
        throw new Error('Refund amount exceeds remaining refundable amount');
      }

      const refund = await this.prisma.refund.create({
        data: {
          paymentId,
          amount,
          reason,
          status: 'PENDING'
        }
      });

      try {
        const stripeResult = await this.stripeService.processRefund({
          paymentIntentId: payment.paymentIntentId,
          amount,
          refundId: refund.id
        });

        const updatedRefund = await this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: stripeResult.success ? 'COMPLETED' : 'FAILED',
            externalRefundId: stripeResult.externalRefundId,
            processedAt: new Date()
          }
        });

        if (stripeResult.success) {
          const newTotalRefunded = totalRefunded + amount;
          if (newTotalRefunded >= payment.amount) {
            await this.prisma.payment.update({
              where: { id: paymentId },
              data: { status: 'REFUNDED' }
            });
          }
        }

        await this.kafkaProducer.publishRefundEvent(
          stripeResult.success ? 'REFUND_COMPLETED' : 'REFUND_FAILED',
          updatedRefund,
          payment
        );

        logger.info('Refund processed successfully', {
          refundId: refund.id,
          paymentId,
          amount,
          status: updatedRefund.status
        });

        return updatedRefund;
      } catch (stripeError) {
        const failedRefund = await this.prisma.refund.update({
          where: { id: refund.id },
          data: {
            status: 'FAILED',
            processedAt: new Date()
          }
        });

        await this.kafkaProducer.publishRefundEvent('REFUND_FAILED', failedRefund, payment);

        logger.error('Refund processing failed', {
          refundId: refund.id,
          error: stripeError.message,
          paymentId
        });

        return failedRefund;
      }
    } catch (error) {
      logger.error('Error processing refund:', { error: error.message, paymentId, amount });
      throw error;
    }
  }

  async getPaymentHistory(userId, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;

      const payments = await this.prisma.payment.findMany({
        where: { userId },
        include: {
          refunds: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      });

      const total = await this.prisma.payment.count({
        where: { userId }
      });

      logger.info('Payment history retrieved successfully', {
        userId,
        count: payments.length,
        total
      });

      return {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error retrieving payment history:', { error: error.message, userId });
      throw error;
    }
  }

  async disconnect() {
    await this.kafkaProducer.disconnect();
    await this.prisma.$disconnect();
  }
}

module.exports = PaymentsService;
