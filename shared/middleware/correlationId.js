const { v4: uuidv4 } = require('uuid');

const correlationId = (req, res, next) => {
  const correlationId = req.headers['cloud-shop-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('cloud-shop-correlation-id', correlationId);
  next();
};

module.exports = correlationId;
