const axios = require('axios');
const axiosRetry = require('axios-retry').default;
const circuitBreakerFactory = require('../../../../../shared/circuit-breaker/circuitBreakerFactory');
const logger = require('../../../../../shared/utils/logger');

class CardsRestClient {
  constructor() {
    this.baseURL = process.env.CARDS_SERVICE_URL || 'http://localhost:9000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.HTTP_CLIENT_TIMEOUT || '5000')
    });

    axiosRetry(this.client, {
      retries: 3,
      retryDelay: (retryCount) => {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.debug(`Retrying cards service call, attempt ${retryCount}, delay: ${delay}ms`);
        return delay;
      },
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
               (error.response && error.response.status >= 500);
      }
    });

    // Create circuit breaker for cards service
    this.circuitBreaker = circuitBreakerFactory.createBreaker(
      'cards-service', 
      this._makeRequest.bind(this),
      {
        timeout: parseInt(process.env.CARDS_SERVICE_TIMEOUT || '3000'),
        errorThresholdPercentage: 50,
        resetTimeout: 30000
      }
    );
  }

  async _makeRequest(url, config) {
    const response = await this.client.get(url, config);
    return response.data;
  }

  async fetchCard(mobileNumber, correlationId) {
    try {
      const headers = {};
      if (correlationId) {
        headers['kurobank-correlation-id'] = correlationId;
      }

      const data = await this.circuitBreaker.fire('/api/fetch', {
        params: { mobileNumber },
        headers
      });

      logger.debug(`Cards fetched successfully for mobile number: ${mobileNumber}`);
      return data;
    } catch (error) {
      if (error.response && error.response.status === 500) {
        logger.warn(`Cards not found for mobile number ${mobileNumber}`);
        throw new Error(`Cards not found for mobile number ${mobileNumber}`);
      }
      if (error.message.includes('circuit breaker')) {
        logger.error('Cards service circuit breaker triggered:', {
          message: error.message,
          mobileNumber,
          correlationId
        });
      } else {
        logger.error('Error calling Cards service after retries:', {
          message: error.message,
          mobileNumber,
          correlationId
        });
      }
      throw error;
    }
  }
}

module.exports = CardsRestClient;
