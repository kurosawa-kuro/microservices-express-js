require('dotenv').config();
const app = require('./src/app');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8085;

app.listen(PORT, () => {
  logger.info(`Orders service is running on port ${PORT}`);
});
