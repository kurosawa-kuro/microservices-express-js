const logger = require('../utils/logger');

const createStandardError = (statusCode, errorCode, message, apiPath) => ({
  timestamp: new Date().toISOString(),
  status: statusCode,
  error: errorCode,
  message,
  path: apiPath
});

const errorHandler = (error, req, res, next) => {
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'An internal server error occurred';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorCode = 'UNAUTHORIZED';
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
    message = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
    message = 'Resource not found';
  }

  const errorResponse = createStandardError(
    statusCode, 
    errorCode, 
    message, 
    req.path
  );

  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    logger.error('API Error', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      correlationId: req.correlationId
    });
  } else {
    console.error(`Error in ${req.path}:`, error);
    errorResponse.debug = {
      stack: error.stack,
      originalError: error.message
    };
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = { errorHandler, createStandardError };
