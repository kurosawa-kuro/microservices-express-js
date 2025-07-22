const axios = require('axios');
const logger = require('../../../shared/utils/logger');

class LoansRestClient {
  constructor() {
    this.baseURL = process.env.LOANS_SERVICE_URL || 'http://localhost:8090';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000
    });
  }

  async fetchLoan(mobileNumber, correlationId) {
    try {
      const headers = {};
      if (correlationId) {
        headers['kurobank-correlation-id'] = correlationId;
      }

      const response = await this.client.get('/api/fetch', {
        params: { mobileNumber },
        headers
      });

      logger.debug(`Loans fetched successfully for mobile number: ${mobileNumber}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 500) {
        throw new Error(`Loans not found for mobile number ${mobileNumber}`);
      }
      logger.error('Error calling Loans service:', error.message);
      throw error;
    }
  }
}

module.exports = LoansRestClient;
