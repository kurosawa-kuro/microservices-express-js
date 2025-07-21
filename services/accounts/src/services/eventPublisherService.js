const { Kafka } = require('kafkajs');
const { AccountsMsgDto } = require('../../../../shared/types');
const logger = require('../../../../shared/utils/logger');

class EventPublisherService {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'accounts-service',
      brokers: [process.env.KAFKA_BROKERS || 'localhost:9092']
    });
    
    this.producer = this.kafka.producer();
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      logger.info('Kafka producer connected');
    }
  }

  async publishAccountCreatedEvent(accountData) {
    try {
      await this.connect();
      
      const validatedData = AccountsMsgDto.parse(accountData);
      
      await this.producer.send({
        topic: process.env.KAFKA_TOPIC_OUTPUT || 'send-communication',
        messages: [
          {
            key: validatedData.mobileNumber,
            value: JSON.stringify(validatedData),
            headers: {
              'event-type': 'account-created',
              'timestamp': new Date().toISOString()
            }
          }
        ]
      });

      logger.info(`Account creation event published for account ${validatedData.accountNumber}`);
    } catch (error) {
      logger.error('Error publishing account creation event:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      logger.info('Kafka producer disconnected');
    }
  }
}

module.exports = EventPublisherService;
