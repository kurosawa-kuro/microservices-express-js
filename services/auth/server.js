require('dotenv').config();
const app = require('./src/app');
const { config, logger } = require('../../shared');

// Get service configuration
const serviceConfig = config.getConfig('auth');

const PORT = serviceConfig.port;
const HOST = serviceConfig.host;

app.listen(PORT, HOST, () => {
  logger.info(`Auth service is running on ${HOST}:${PORT}`, {
    service: 'auth-service',
    environment: serviceConfig.nodeEnv,
    version: serviceConfig.service.version
  });
});
