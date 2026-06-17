const { body } = require('express-validator');

const checkInValidation = [
  body('qrData').notEmpty().withMessage('QR data is required'),
];

module.exports = { checkInValidation };
