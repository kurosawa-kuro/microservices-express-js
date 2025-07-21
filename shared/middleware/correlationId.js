const { v4: uuidv4 } = require('uuid');

const correlationId = (req, res, next) => {
  const correlationId = req.headers['kurobank-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('kurobank-correlation-id', correlationId);
  next();
};

module.exports = correlationId;
