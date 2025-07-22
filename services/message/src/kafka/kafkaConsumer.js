const { Kafka } = require('kafkajs');
const logger = require('../shared/utils/logger');
const MessageService = require('../services/messageService');

class KafkaConsumer {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'message-service',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    
    this.consumer = this.kafka.consumer({ 
      groupId: process.env.KAFKA_GROUP_ID || 'message' 
    });
    
    this.messageService = new MessageService();
  }

  async start() {
    try {
      await this.consumer.connect();
      logger.info('Kafka consumer connected');

      await this.consumer.subscribe({ 
        topic: process.env.KAFKA_TOPIC_INPUT || 'send-communication' 
      });

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const accountData = JSON.parse(message.value.toString());
            logger.info(`Received message from topic ${topic}:`, accountData);

            await Promise.all([
              this.messageService.processEmail(accountData),
              this.messageService.processSms(accountData)
            ]);

            logger.info(`Successfully processed message for account ${accountData.accountNumber}`);
          } catch (error) {
            logger.error('Error processing Kafka message:', error);
          }
        },
      });
    } catch (error) {
      logger.error('Error starting Kafka consumer:', error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.consumer.disconnect();
      logger.info('Kafka consumer disconnected');
    } catch (error) {
      logger.error('Error stopping Kafka consumer:', error);
    }
  }
}

module.exports = KafkaConsumer;
