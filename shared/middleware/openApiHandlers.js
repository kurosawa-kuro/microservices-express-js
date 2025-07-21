const createOpenApiHandlers = (serviceName) => {
  return {
    healthCheck: (c, req, res) => {
      return res.status(200).json({ 
        status: 'UP', 
        timestamp: new Date().toISOString(),
        service: serviceName
      });
    },

    validationFail: (c, req, res, err) => {
      return res.status(400).json({
        apiPath: req.path,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: err?.message || 'Validation failed',
        errorTime: new Date().toISOString()
      });
    },

    notFound: (req, res) => {
      return res.status(404).json({
        apiPath: req.path,
        errorCode: 'NOT_FOUND',
        errorMessage: 'API endpoint not found',
        errorTime: new Date().toISOString()
      });
    }
  };
};

module.exports = createOpenApiHandlers;
