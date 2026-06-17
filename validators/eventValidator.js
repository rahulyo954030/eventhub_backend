const { body, param } = require('express-validator');

const createEventValidation = [
  body('name').trim().notEmpty().withMessage('Event name is required'),
  body('description').optional().trim(),
  body('venue').trim().notEmpty().withMessage('Venue is required'),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
  body('eventTime').trim().notEmpty().withMessage('Event time is required'),
  body('organizerName').trim().notEmpty().withMessage('Organizer name is required'),
  body('organizerEmail').isEmail().withMessage('Valid organizer email is required'),
  body('status').optional().isIn(['draft', 'published', 'archived']),
];

const updateEventValidation = [
  param('id').isMongoId().withMessage('Invalid event ID'),
  body('name').optional().trim().notEmpty().withMessage('Event name cannot be empty'),
  body('venue').optional().trim().notEmpty().withMessage('Venue cannot be empty'),
  body('eventDate').optional().isISO8601().withMessage('Valid event date is required'),
  body('eventTime').optional().trim().notEmpty().withMessage('Event time cannot be empty'),
  body('organizerName').optional().trim().notEmpty(),
  body('organizerEmail').optional().isEmail(),
  body('status').optional().isIn(['draft', 'published', 'archived']),
];

const eventIdValidation = [
  param('id').isMongoId().withMessage('Invalid event ID'),
];

const eventPathEventIdValidation = [
  param('eventId').isMongoId().withMessage('Invalid event ID'),
];

module.exports = {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
  eventPathEventIdValidation,
};
