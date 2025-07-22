const express = require('express');
const router = express.Router();
const { validators, handleValidationErrors } = require('../../../../shared/middleware/inputValidation');
const controllers = require('../controllers');

router.post('/cards',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.createCard
);

router.get('/cards',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.fetchCard
);

router.put('/cards',
  validators.cardNumber(),
  handleValidationErrors,
  controllers.updateCard
);

router.delete('/cards',
  validators.mobileNumber(),
  handleValidationErrors,
  controllers.deleteCard
);

module.exports = router;