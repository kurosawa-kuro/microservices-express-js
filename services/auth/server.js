require('dotenv').config();
const app = require('./src/app');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  logger.info(`Auth service is running on port ${PORT}`);
});
