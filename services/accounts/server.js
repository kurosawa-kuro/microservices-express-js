const app = require('./src/app');
const logger = require('../shared/utils/logger');

const PORT = process.env.PORT || 8080;

const server = app.listen(PORT, () => {
  logger.info(`Accounts Service running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Accounts Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Accounts Service stopped');
    process.exit(0);
  });
});
