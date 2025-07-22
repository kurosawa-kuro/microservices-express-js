const HealthChecker = require('../health/healthChecker');
const circuitBreakerFactory = require('../circuit-breaker/circuitBreakerFactory');

const createHealthCheckHandler = (serviceName, options = {}) => {
  const healthChecker = new HealthChecker();
  
  // Add circuit breaker status check
  healthChecker.addCheck('circuit-breakers', async () => {
    const stats = circuitBreakerFactory.getAllBreakerStats();
    return { circuitBreakers: stats };
  }, { critical: false });

  // Add custom checks if provided
  if (options.customChecks) {
    options.customChecks.forEach(check => {
      healthChecker.addCheck(check.name, check.check, check.options);
    });
  }

  return async (req, res) => {
    try {
      const healthStatus = await healthChecker.getHealthStatus();
      
      const response = {
        ...healthStatus,
        service: serviceName,
        version: process.env.BUILD_VERSION || 'unknown'
      };

      const statusCode = healthStatus.status === 'UP' ? 200 : 503;
      res.status(statusCode).json(response);
    } catch (error) {
      res.status(503).json({
        status: 'DOWN',
        service: serviceName,
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  };
};

module.exports = createHealthCheckHandler;
