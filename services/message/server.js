const app = require('./src/app');
const KafkaConsumer = require('./src/kafka/kafkaConsumer');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 9010;
const kafkaConsumer = new KafkaConsumer();

kafkaConsumer.start().catch(error => {
  logger.error('Failed to start Kafka consumer:', error);
  process.exit(1);
});

const server = app.listen(PORT, () => {
  logger.info(`Message Service running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await kafkaConsumer.stop();
  server.close(() => {
    logger.info('Message Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await kafkaConsumer.stop();
  server.close(() => {
    logger.info('Message Service stopped');
    process.exit(0);
  });
});
