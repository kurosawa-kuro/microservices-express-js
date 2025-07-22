require('dotenv').config();
const app = require('./src/app');
const PaymentEventConsumer = require('./src/kafka/paymentEventConsumer');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8086;
const paymentEventConsumer = new PaymentEventConsumer();

paymentEventConsumer.start().catch(error => {
  logger.error('Failed to start Payment event consumer:', error);
  logger.warn('Continuing without Payment event consumer for local development');
});

const server = app.listen(PORT, () => {
  logger.info(`Payments service is running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await paymentEventConsumer.stop();
  server.close(() => {
    logger.info('Payments Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await paymentEventConsumer.stop();
  server.close(() => {
    logger.info('Payments Service stopped');
    process.exit(0);
  });
});
