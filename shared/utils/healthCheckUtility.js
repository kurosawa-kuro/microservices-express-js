const createHealthCheckHandler = (serviceName) => {
  return (req, res) => {
    res.status(200).json({ 
      status: 'UP', 
      timestamp: new Date().toISOString(),
      service: serviceName
    });
  };
};

module.exports = createHealthCheckHandler;
