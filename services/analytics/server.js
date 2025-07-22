require('dotenv').config();
const app = require('./src/app');
const logger = require('../../shared/utils/logger');

const PORT = process.env.PORT || 8087;

app.listen(PORT, () => {
  logger.info(`Analytics service is running on port ${PORT}`);
});
