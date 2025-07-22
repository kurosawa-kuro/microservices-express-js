require('dotenv').config();
const app = require('./src/app');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8088;

app.listen(PORT, () => {
  logger.info(`Content service is running on port ${PORT}`);
});
