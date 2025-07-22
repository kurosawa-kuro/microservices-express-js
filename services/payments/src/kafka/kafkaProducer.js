const { Kafka } = require('kafkajs');
const logger = require('../../../../shared/utils/logger');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'payments-service',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    
    this.producer = this.kafka.producer();
    this.isConnected = false;
  }

  async connect() {
    try {
      if (!this.isConnected) {
        await this.producer.connect();
        this.isConnected = true;
        logger.info('Kafka producer connected');
      }
    } catch (error) {
      logger.error('Error connecting Kafka producer:', error);
      throw error;
    }
  }

  async publishPaymentEvent(eventType, paymentData) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_PAYMENTS || 'payment-events',
        messages: [{
          key: paymentData.id.toString(),
          value: JSON.stringify({
            eventType,
            paymentId: paymentData.id,
            orderId: paymentData.orderId,
            userId: paymentData.userId,
            amount: paymentData.amount,
            status: paymentData.status,
            timestamp: new Date().toISOString(),
            paymentData
          })
        }]
      };

      await this.producer.send(message);
      logger.info(`Payment event published: ${eventType}`, { 
        paymentId: paymentData.id, 
        orderId: paymentData.orderId,
        eventType 
      });
    } catch (error) {
      logger.error('Error publishing payment event:', error);
      throw error;
    }
  }

  async publishRefundEvent(eventType, refundData, paymentData) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_REFUNDS || 'refund-events',
        messages: [{
          key: refundData.id.toString(),
          value: JSON.stringify({
            eventType,
            refundId: refundData.id,
            paymentId: refundData.paymentId,
            orderId: paymentData.orderId,
            userId: paymentData.userId,
            amount: refundData.amount,
            status: refundData.status,
            timestamp: new Date().toISOString(),
            refundData,
            paymentData
          })
        }]
      };

      await this.producer.send(message);
      logger.info(`Refund event published: ${eventType}`, { 
        refundId: refundData.id, 
        paymentId: refundData.paymentId,
        eventType 
      });
    } catch (error) {
      logger.error('Error publishing refund event:', error);
      throw error;
    }
  }

  async publishOrderEvent(eventType, orderData) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_ORDERS || 'order-events',
        messages: [{
          key: orderData.orderId.toString(),
          value: JSON.stringify({
            eventType,
            orderId: orderData.orderId,
            userId: orderData.userId,
            status: orderData.status,
            timestamp: new Date().toISOString(),
            orderData
          })
        }]
      };

      await this.producer.send(message);
      logger.info(`Order event published: ${eventType}`, { 
        orderId: orderData.orderId, 
        eventType 
      });
    } catch (error) {
      logger.error('Error publishing order event:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info('Kafka producer disconnected');
      }
    } catch (error) {
      logger.error('Error disconnecting Kafka producer:', error);
    }
  }
}

module.exports = KafkaProducer;
