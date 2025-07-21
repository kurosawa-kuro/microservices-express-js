const bigIntSerializer = (req, res, next) => {
  const originalJson = res.json;
  res.json = function(obj) {
    return originalJson.call(this, JSON.parse(JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )));
  };
  next();
};

module.exports = bigIntSerializer;
