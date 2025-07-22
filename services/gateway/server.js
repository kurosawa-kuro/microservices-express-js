const app = require('./src/app');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8072;

const server = app.listen(PORT, () => {
  logger.info(`Gateway Service running on port ${PORT}`);
  logger.info('Available routes:');
  logger.info('  - GET  /actuator/health (public)');
  logger.info('  - GET  /api/health (public)');
  logger.info('  - ALL  /kurobank/accounts/** (requires ACCOUNTS role)');
  logger.info('  - ALL  /kurobank/cards/** (requires CARDS role)');
  logger.info('  - ALL  /kurobank/loans/** (requires LOANS role)');
  logger.info('');
  logger.info('To generate test JWT tokens, run:');
  logger.info('  node src/utils/tokenGenerator.js');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Gateway Service stopped');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Gateway Service stopped');
    process.exit(0);
  });
});
