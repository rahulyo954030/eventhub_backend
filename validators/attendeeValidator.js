const { body, param } = require('express-validator');

const createAttendeeValidation = [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('mobile').optional().trim(),
  body('company').optional().trim(),
];

const updateAttendeeValidation = [
  param('id').isMongoId().withMessage('Invalid attendee ID'),
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('mobile').optional().trim(),
  body('company').optional().trim(),
];

const attendeeIdValidation = [
  param('id').isMongoId().withMessage('Invalid attendee ID'),
];

const registrationValidation = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required'),
  body('company').optional().trim(),
];

const registrationTokenValidation = [
  param('token').notEmpty().withMessage('Registration token is required'),
];

module.exports = {
  createAttendeeValidation,
  updateAttendeeValidation,
  attendeeIdValidation,
  registrationValidation,
  registrationTokenValidation,
};
