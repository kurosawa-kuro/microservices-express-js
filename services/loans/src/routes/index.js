const express = require('express');
const router = express.Router();
const { validators, handleValidationErrors } = require('../../../../shared/middleware/inputValidation');
const controllers = require('../controllers');

router.post('/loans',
  validators.mobileNumber(),
  validators.amount(),
  handleValidationErrors,
  controllers.createLoan
);

router.get('/loans',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.fetchLoan
);

router.put('/loans',
  validators.loanNumber(),
  handleValidationErrors,
  controllers.updateLoan
);

router.delete('/loans',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.deleteLoan
);

module.exports = router;