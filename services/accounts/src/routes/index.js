const express = require('express');
const router = express.Router();
const { validators, handleValidationErrors } = require('../../../../shared/middleware/inputValidation');
const controllers = require('../controllers');

router.post('/accounts',
  validators.mobileNumber(),
  validators.name(),
  validators.email(),
  handleValidationErrors,
  controllers.createAccount
);

router.get('/accounts',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.fetchAccount
);

router.put('/accounts',
  validators.mobileNumber(),
  validators.name(),
  validators.email(),
  handleValidationErrors,
  controllers.updateAccount
);

router.delete('/accounts',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.deleteAccount
);

router.get('/customers/:customerNumber',
  validators.customerNumber(),
  handleValidationErrors,
  controllers.fetchCustomerDetails
);

module.exports = router;