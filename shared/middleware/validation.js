const validation = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      const errorResponse = {
        apiPath: req.path,
        errorCode: 'VALIDATION_ERROR',
        errorMessage: 'Invalid input data',
        errorTime: new Date().toISOString(),
        details: error.errors
      };
      res.status(400).json(errorResponse);
    }
  };
};

module.exports = validation;
