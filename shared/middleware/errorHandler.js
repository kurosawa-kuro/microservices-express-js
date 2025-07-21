const errorHandler = (error, req, res, next) => {
  const errorResponse = {
    apiPath: req.path,
    errorCode: 'INTERNAL_SERVER_ERROR',
    errorMessage: error.message,
    errorTime: new Date().toISOString()
  };

  console.error(`Error in ${req.path}:`, error);
  res.status(500).json(errorResponse);
};

module.exports = errorHandler;
