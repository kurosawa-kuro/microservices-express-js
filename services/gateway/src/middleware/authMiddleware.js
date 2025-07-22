const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const axios = require('axios');
const crypto = require('crypto');
const NodeCache = require('node-cache');
const logger = require('../../../shared/utils/logger');

const tokenCache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60,
  useClones: false
});

const client = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  requestHeaders: {},
  timeout: 30000,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.publicKey || key?.rsaPublicKey;
    callback(null, signingKey);
  });
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Authentication failed: Missing or invalid authorization header', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        correlationId: req.correlationId
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header',
        timestamp: new Date().toISOString()
      });
    }

    const token = authHeader.substring(7);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    const cachedUser = tokenCache.get(tokenHash);
    if (cachedUser) {
      req.user = cachedUser;
      logger.debug(`Token cache hit for user: ${req.user.preferred_username}`, {
        correlationId: req.correlationId
      });
      return next();
    }
    
    jwt.verify(token, getKey, {
      audience: process.env.KEYCLOAK_CLIENT_ID,
      issuer: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        logger.error('Token verification error:', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          correlationId: req.correlationId
        });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token',
          timestamp: new Date().toISOString()
        });
      }

      const user = {
        sub: decoded.sub,
        email: decoded.email,
        name: decoded.name,
        preferred_username: decoded.preferred_username,
        roles: decoded.realm_access?.roles || []
      };

      const tokenTTL = Math.max(0, decoded.exp - Math.floor(Date.now() / 1000));
      const cacheTTL = Math.min(tokenTTL, 300);
      
      if (cacheTTL > 0) {
        tokenCache.set(tokenHash, user, cacheTTL);
        logger.debug(`Token cached for user: ${user.preferred_username}, TTL: ${cacheTTL}s`, {
          correlationId: req.correlationId
        });
      }

      req.user = user;
      logger.info(`User authenticated: ${req.user.preferred_username}`, {
        roles: req.user.roles,
        correlationId: req.correlationId,
        cached: false
      });
      next();
    });

  } catch (error) {
    logger.error('Authentication error:', {
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      correlationId: req.correlationId
    });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = authMiddleware;
