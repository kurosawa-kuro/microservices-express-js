const axios = require('axios');
const logger = require('../../../shared/utils/logger');

class CardsRestClient {
  constructor() {
    this.baseURL = process.env.CARDS_SERVICE_URL || 'http://localhost:9000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000
    });
  }

  async fetchCard(mobileNumber, correlationId) {
    try {
      const headers = {};
      if (correlationId) {
        headers['kurobank-correlation-id'] = correlationId;
      }

      const response = await this.client.get('/api/fetch', {
        params: { mobileNumber },
        headers
      });

      logger.debug(`Cards fetched successfully for mobile number: ${mobileNumber}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 500) {
        throw new Error(`Cards not found for mobile number ${mobileNumber}`);
      }
      logger.error('Error calling Cards service:', error.message);
      throw error;
    }
  }
}

module.exports = CardsRestClient;
