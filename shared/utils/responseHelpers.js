/**
 * Standardized response helpers for Cloud-Shop microservices
 */

/**
 * Create a standardized success response
 * @param {any} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized response object
 */
const createStandardResponse = (data, statusCode = 200, message = null, req = null) => {
  const response = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    data: data,
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (req && req.correlationId) {
    response.correlationId = req.correlationId;
  }

  return response;
};

/**
 * Create a standardized paginated response
 * @param {Array} data - Response data array
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized paginated response object
 */
const createPaginatedResponse = (data, page, limit, total, req = null) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const response = {
    timestamp: new Date().toISOString(),
    status: 200,
    data: data,
    success: true,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  };

  if (req && req.correlationId) {
    response.correlationId = req.correlationId;
  }

  return response;
};

/**
 * Create a standardized empty response
 * @param {number} statusCode - HTTP status code (default: 204)
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized empty response object
 */
const createEmptyResponse = (statusCode = 204, message = null, req = null) => {
  const response = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (req && req.correlationId) {
    response.correlationId = req.correlationId;
  }

  return response;
};

/**
 * Create a standardized list response
 * @param {Array} items - List of items
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized list response object
 */
const createListResponse = (items, statusCode = 200, message = null, req = null) => {
  const response = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    data: {
      items,
      count: items.length
    },
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (req && req.correlationId) {
    response.correlationId = req.correlationId;
  }

  return response;
};

/**
 * Create a standardized single item response
 * @param {Object} item - Single item
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized single item response object
 */
const createItemResponse = (item, statusCode = 200, message = null, req = null) => {
  const response = {
    timestamp: new Date().toISOString(),
    status: statusCode,
    data: item,
    success: true
  };

  if (message) {
    response.message = message;
  }

  if (req && req.correlationId) {
    response.correlationId = req.correlationId;
  }

  return response;
};

/**
 * Create a standardized created response
 * @param {Object} item - Created item
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized created response object
 */
const createCreatedResponse = (item, message = 'Resource created successfully', req = null) => {
  return createItemResponse(item, 201, message, req);
};

/**
 * Create a standardized updated response
 * @param {Object} item - Updated item
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized updated response object
 */
const createUpdatedResponse = (item, message = 'Resource updated successfully', req = null) => {
  return createItemResponse(item, 200, message, req);
};

/**
 * Create a standardized deleted response
 * @param {string} message - Success message (optional)
 * @param {Object} req - Express request object (for correlationId)
 * @returns {Object} Standardized deleted response object
 */
const createDeletedResponse = (message = 'Resource deleted successfully', req = null) => {
  return createEmptyResponse(200, message, req);
};

/**
 * Express middleware to add response helpers to res object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const responseHelpersMiddleware = (req, res, next) => {
  // Add response helpers to res object
  res.standardResponse = (data, statusCode, message) => {
    return res.status(statusCode || 200).json(
      createStandardResponse(data, statusCode, message, req)
    );
  };

  res.paginatedResponse = (data, page, limit, total) => {
    return res.status(200).json(
      createPaginatedResponse(data, page, limit, total, req)
    );
  };

  res.emptyResponse = (statusCode, message) => {
    return res.status(statusCode || 204).json(
      createEmptyResponse(statusCode, message, req)
    );
  };

  res.listResponse = (items, statusCode, message) => {
    return res.status(statusCode || 200).json(
      createListResponse(items, statusCode, message, req)
    );
  };

  res.itemResponse = (item, statusCode, message) => {
    return res.status(statusCode || 200).json(
      createItemResponse(item, statusCode, message, req)
    );
  };

  res.createdResponse = (item, message) => {
    return res.status(201).json(
      createCreatedResponse(item, message, req)
    );
  };

  res.updatedResponse = (item, message) => {
    return res.status(200).json(
      createUpdatedResponse(item, message, req)
    );
  };

  res.deletedResponse = (message) => {
    return res.status(200).json(
      createDeletedResponse(message, req)
    );
  };

  next();
};

module.exports = {
  createStandardResponse,
  createPaginatedResponse,
  createEmptyResponse,
  createListResponse,
  createItemResponse,
  createCreatedResponse,
  createUpdatedResponse,
  createDeletedResponse,
  responseHelpersMiddleware
}; 