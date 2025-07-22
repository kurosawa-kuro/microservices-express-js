const { Kafka } = require('kafkajs');
const logger = require('../../../../shared/utils/logger');
const OrdersService = require('../services/ordersService');

class OrderEventConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'orders-event-consumer',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID_ORDERS || 'orders-events' 
    });
    
    this.ordersService = new OrdersService();
  }

  async start() {
    try {
      await this.consumer.connect();
      logger.info('Order event consumer connected');

      await this.consumer.subscribe({ 
        topics: [
          process.env.KAFKA_TOPIC_PAYMENTS || 'payment-events',
          process.env.KAFKA_TOPIC_INVENTORY || 'inventory-events',
          process.env.KAFKA_TOPIC_SHIPPING || 'shipping-events'
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
            logger.error('Error processing order event:', error);
          }
        },
      });
    } catch (error) {
      logger.error('Error starting order event consumer:', error);
      throw error;
    }
  }

  async handleEvent(topic, eventData) {
    const { eventType, orderId } = eventData;

    switch (topic) {
      case process.env.KAFKA_TOPIC_PAYMENTS || 'payment-events':
        await this.handlePaymentEvent(eventType, orderId, eventData);
        break;
      
      case process.env.KAFKA_TOPIC_INVENTORY || 'inventory-events':
        await this.handleInventoryEvent(eventType, orderId, eventData);
        break;
      
      case process.env.KAFKA_TOPIC_SHIPPING || 'shipping-events':
        await this.handleShippingEvent(eventType, orderId, eventData);
        break;
      
      default:
        logger.warn(`Unknown topic: ${topic}`);
    }
  }

  async handlePaymentEvent(eventType, orderId, eventData) {
    try {
      switch (eventType) {
        case 'PAYMENT_COMPLETED':
          await this.ordersService.updateOrderStatus(orderId, 'CONFIRMED');
          logger.info(`Order ${orderId} confirmed after payment completion`);
          break;
        
        case 'PAYMENT_FAILED':
          await this.ordersService.updateOrderStatus(orderId, 'CANCELLED');
          logger.info(`Order ${orderId} cancelled due to payment failure`);
          break;
        
        default:
          logger.info(`Unhandled payment event: ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error handling payment event for order ${orderId}:`, error);
    }
  }

  async handleInventoryEvent(eventType, orderId, eventData) {
    try {
      switch (eventType) {
        case 'INVENTORY_RESERVED':
          await this.ordersService.updateOrderStatus(orderId, 'PROCESSING');
          logger.info(`Order ${orderId} moved to processing after inventory reservation`);
          break;
        
        case 'INVENTORY_INSUFFICIENT':
          await this.ordersService.updateOrderStatus(orderId, 'CANCELLED');
          logger.info(`Order ${orderId} cancelled due to insufficient inventory`);
          break;
        
        default:
          logger.info(`Unhandled inventory event: ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error handling inventory event for order ${orderId}:`, error);
    }
  }

  async handleShippingEvent(eventType, orderId, eventData) {
    try {
      switch (eventType) {
        case 'SHIPMENT_CREATED':
          await this.ordersService.updateOrderStatus(orderId, 'SHIPPED');
          logger.info(`Order ${orderId} marked as shipped`);
          break;
        
        case 'DELIVERY_COMPLETED':
          await this.ordersService.updateOrderStatus(orderId, 'DELIVERED');
          logger.info(`Order ${orderId} marked as delivered`);
          break;
        
        default:
          logger.info(`Unhandled shipping event: ${eventType}`);
      }
    } catch (error) {
      logger.error(`Error handling shipping event for order ${orderId}:`, error);
    }
  }

  async stop() {
    try {
      await this.consumer.disconnect();
      logger.info('Order event consumer disconnected');
    } catch (error) {
      logger.error('Error stopping order event consumer:', error);
    }
  }
}

module.exports = OrderEventConsumer;
