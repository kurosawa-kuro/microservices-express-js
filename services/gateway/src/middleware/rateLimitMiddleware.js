const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../../shared/utils/logger');

const authRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.AUTH_RATE_LIMIT_REQUESTS || '10'),
  duration: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW || '60'),
  blockDuration: parseInt(process.env.AUTH_RATE_LIMIT_BLOCK || '300'),
});

const generalRateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip,
  points: parseInt(process.env.GENERAL_RATE_LIMIT_REQUESTS || '100'),
  duration: parseInt(process.env.GENERAL_RATE_LIMIT_WINDOW || '60'),
  blockDuration: parseInt(process.env.GENERAL_RATE_LIMIT_BLOCK || '60'),
});

const createRateLimitMiddleware = (limiter, type = 'general') => {
  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (rateLimiterRes) {
      const secs = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
      
      logger.warn(`Rate limit exceeded for ${type}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId,
        type: type,
        retryAfter: secs,
        totalHits: rateLimiterRes.totalHits,
        remainingPoints: rateLimiterRes.remainingPoints
      });

      res.set('Retry-After', String(secs));
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${secs} seconds.`,
        retryAfter: secs,
        timestamp: new Date().toISOString()
      });
    }
  };
};

const authRateLimit = createRateLimitMiddleware(authRateLimiter, 'authentication');
const generalRateLimit = createRateLimitMiddleware(generalRateLimiter, 'general');

module.exports = {
  authRateLimit,
  generalRateLimit,
  createRateLimitMiddleware
};
