const logger = require('../utils/logger');

const createTimeoutMiddleware = (timeoutMs = null) => {
  const timeout = timeoutMs || parseInt(process.env.REQUEST_TIMEOUT || '30000'); // 30 seconds default

  return (req, res, next) => {
    // Set timeout for the request
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Request timeout after ${timeout}ms`, {
          method: req.method,
          url: req.url,
          correlationId: req.correlationId
        });
        
        res.status(408).json({
          timestamp: new Date().toISOString(),
          status: 408,
          error: 'REQUEST_TIMEOUT',
          message: `Request timeout after ${timeout}ms`,
          path: req.url
        });
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });

    res.on('close', () => {
      clearTimeout(timeoutId);
    });

    // Store timeout info on request for debugging
    req.timeout = {
      value: timeout,
      startTime: Date.now(),
      timeoutId
    };

    next();
  };
};

module.exports = createTimeoutMiddleware;