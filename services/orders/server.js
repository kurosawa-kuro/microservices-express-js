require('dotenv').config();
const app = require('./src/app');
const OrderEventConsumer = require('./src/kafka/orderEventConsumer');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8085;
const orderEventConsumer = new OrderEventConsumer();

orderEventConsumer.start().catch(error => {
  logger.error('Failed to start Order event consumer:', error);
  logger.warn('Continuing without Order event consumer for local development');
});

const server = app.listen(PORT, () => {
  logger.info(`Orders service is running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await orderEventConsumer.stop();
  server.close(() => {
    logger.info('Orders Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await orderEventConsumer.stop();
  server.close(() => {
    logger.info('Orders Service stopped');
    process.exit(0);
  });
});
