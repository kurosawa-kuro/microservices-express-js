const createCommonHandlers = (serviceName) => {
  const serviceDisplayName = serviceName.charAt(0).toUpperCase() + serviceName.slice(1);
  const servicePhone = serviceName.toUpperCase();
  
  return {
    getBuildInfo: async (c, req, res) => {
      return res.status(200).json({
        version: process.env.BUILD_VERSION || '1.0.0',
        timestamp: new Date().toISOString()
      });
    },

    getContactInfo: async (c, req, res) => {
      return res.status(200).json({
        name: `Kuro Bytes - ${serviceDisplayName} Service`,
        email: 'support@kurobytes.com',
        onCallSupport: `+1-555-${servicePhone}`
      });
    }
  };
};

module.exports = createCommonHandlers;
