const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

const sanitizeInput = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

const validators = {
  mobileNumber: () => 
    body('mobileNumber')
      .trim()
      .matches(/^[0-9]{10,15}$/)
      .withMessage('Mobile number must be 10-15 digits')
      .customSanitizer(sanitizeInput),
  
  accountNumber: () =>
    param('accountNumber')
      .trim()
      .isNumeric()
      .isLength({ min: 10, max: 10 })
      .withMessage('Account number must be exactly 10 digits')
      .customSanitizer(sanitizeInput),
  
  customerNumber: () =>
    param('customerNumber')
      .trim()
      .isNumeric()
      .isLength({ min: 10, max: 10 })
      .withMessage('Customer number must be exactly 10 digits')
      .customSanitizer(sanitizeInput),
  
  cardNumber: () =>
    param('cardNumber')
      .trim()
      .isNumeric()
      .isLength({ min: 16, max: 16 })
      .withMessage('Card number must be exactly 16 digits')
      .customSanitizer(sanitizeInput),
  
  loanNumber: () =>
    param('loanNumber')
      .trim()
      .isNumeric()
      .isLength({ min: 10, max: 10 })
      .withMessage('Loan number must be exactly 10 digits')
      .customSanitizer(sanitizeInput),
  
  name: () =>
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
      .customSanitizer(sanitizeInput),
  
  email: () =>
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address')
      .customSanitizer(sanitizeInput),
  
  amount: () =>
    body('amount')
      .isFloat({ min: 0 })
      .withMessage('Amount must be a positive number')
      .toFloat(),
  
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt()
  ]
};

module.exports = {
  validators,
  handleValidationErrors,
  sanitizeInput
};