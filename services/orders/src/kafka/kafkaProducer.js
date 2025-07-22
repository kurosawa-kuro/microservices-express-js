const { Kafka } = require('kafkajs');
const logger = require('../../../../shared/utils/logger');

class KafkaProducer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'orders-service',
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

  async publishOrderEvent(eventType, orderData) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_ORDERS || 'order-events',
        messages: [{
          key: orderData.id.toString(),
          value: JSON.stringify({
            eventType,
            orderId: orderData.id,
            userId: orderData.userId,
            status: orderData.status,
            totalAmount: orderData.totalAmount,
            timestamp: new Date().toISOString(),
            orderData
          })
        }]
      };

      await this.producer.send(message);
      logger.info(`Order event published: ${eventType}`, { 
        orderId: orderData.id, 
        eventType 
      });
    } catch (error) {
      logger.error('Error publishing order event:', error);
      throw error;
    }
  }

  async publishPaymentEvent(orderId, paymentData) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_PAYMENTS || 'payment-events',
        messages: [{
          key: orderId.toString(),
          value: JSON.stringify({
            eventType: 'PAYMENT_REQUESTED',
            orderId,
            amount: paymentData.amount,
            paymentMethod: paymentData.paymentMethod,
            timestamp: new Date().toISOString(),
            paymentData
          })
        }]
      };

      await this.producer.send(message);
      logger.info('Payment event published', { orderId });
    } catch (error) {
      logger.error('Error publishing payment event:', error);
      throw error;
    }
  }

  async publishInventoryEvent(orderId, orderItems) {
    try {
      await this.connect();
      
      const message = {
        topic: process.env.KAFKA_TOPIC_INVENTORY || 'inventory-events',
        messages: [{
          key: orderId.toString(),
          value: JSON.stringify({
            eventType: 'INVENTORY_RESERVE_REQUESTED',
            orderId,
            items: orderItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              productName: item.productName
            })),
            timestamp: new Date().toISOString()
          })
        }]
      };

      await this.producer.send(message);
      logger.info('Inventory event published', { orderId });
    } catch (error) {
      logger.error('Error publishing inventory event:', error);
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
