const { Kafka } = require('kafkajs');
const logger = require('../../../../shared/utils/logger');
const PaymentsService = require('../services/paymentsService');

class PaymentEventConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'payments-event-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID_PAYMENTS || 'payment-events' 
    });
    
    this.paymentsService = new PaymentsService();
  }

  async start() {
    try {
      await this.consumer.connect();
      logger.info('Payment event consumer connected');

      await this.consumer.subscribe({ 
        topics: [
          process.env.KAFKA_TOPIC_ORDERS || 'order-events'
        ]
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventData = JSON.parse(message.value.toString());
            logger.info(`Received event from topic ${topic}:`, eventData);

            await this.handleEvent(topic, eventData);
            
            logger.info(`Successfully processed event for order ${eventData.orderId}`);
          } catch (error) {
            logger.error('Error processing payment event:', error);
          }
        },
      });
    } catch (error) {
      logger.error('Error starting payment event consumer:', error);
      throw error;
    }
  }

  async handleEvent(topic, eventData) {
    const { eventType, orderId } = eventData;

    switch (topic) {
      case process.env.KAFKA_TOPIC_ORDERS || 'order-events':
        await this.handleOrderEvent(eventType, orderId, eventData);
        break;
      
      default:
        logger.warn(`Unknown topic: ${topic}`);
    }
  }

  async handleOrderEvent(eventType, orderId, eventData) {
    try {
      switch (eventType) {
        case 'ORDER_CREATED':
          logger.info(`Order ${orderId} created, payment processing will be triggered by order service`);
          break;
        
        case 'ORDER_CANCELLED':
          logger.info(`Order ${orderId} cancelled, checking for payments to refund`);
          await this.handleOrderCancellation(orderId, eventData);
          break;
        
        default:
          logger.info(`Unhandled order event: ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error handling order event for order ${orderId}:`, error);
    }
  }

  async handleOrderCancellation(orderId, eventData) {
    try {
      const payments = await this.paymentsService.prisma.payment.findMany({
        where: { 
          orderId: orderId,
          status: 'COMPLETED'
        },
        include: { refunds: true }
      });

      for (const payment of payments) {
        const totalRefunded = payment.refunds
          .filter(r => r.status === 'COMPLETED')
          .reduce((sum, r) => sum + r.amount, 0);

        const refundableAmount = payment.amount - totalRefunded;

        if (refundableAmount > 0) {
          logger.info(`Auto-refunding payment ${payment.id} for cancelled order ${orderId}`);
          
          await this.paymentsService.refundPayment(
            payment.id,
            refundableAmount,
            'Order cancellation - automatic refund'
          );
        }
      }
    } catch (error) {
      logger.error(`Error handling order cancellation refunds for order ${orderId}:`, error);
    }
  }

  async stop() {
    try {
      await this.consumer.disconnect();
      logger.info('Payment event consumer disconnected');
    } catch (error) {
      logger.error('Error stopping payment event consumer:', error);
    }
  }
}

module.exports = PaymentEventConsumer;
