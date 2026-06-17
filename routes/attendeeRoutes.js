const express = require('express');
const attendeeController = require('../controllers/attendeeController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createAttendeeValidation,
  updateAttendeeValidation,
  attendeeIdValidation,
} = require('../validators/attendeeValidator');
const { eventPathEventIdValidation } = require('../validators/eventValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Attendees
 *   description: Attendee management endpoints
 */

/**
 * @swagger
 * /api/events/{eventId}/attendees:
 *   post:
 *     summary: Add attendee manually
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               mobile: { type: string }
 *               company: { type: string }
 *     responses:
 *       201:
 *         description: Attendee added
 */
router.post(
  '/events/:eventId/attendees',
  authorize('Admin'),
  createAttendeeValidation,
  validate,
  attendeeController.createAttendee
);

/**
 * @swagger
 * /api/events/{eventId}/attendees:
 *   get:
 *     summary: List attendees for an event
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: invitationStatus
 *         schema: { type: string }
 *       - in: query
 *         name: registrationStatus
 *         schema: { type: string }
 *       - in: query
 *         name: attendanceStatus
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Paginated attendees list
 */
router.get(
  '/events/:eventId/attendees',
  eventPathEventIdValidation,
  validate,
  attendeeController.getAttendees
);

/**
 * @swagger
 * /api/events/{eventId}/attendees/bulk-upload:
 *   post:
 *     summary: Bulk upload attendees via CSV or Excel
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Bulk upload completed
 */
router.post(
  '/events/:eventId/attendees/bulk-upload',
  authorize('Admin'),
  eventPathEventIdValidation,
  validate,
  upload.single('file'),
  attendeeController.bulkUpload
);

/**
 * @swagger
 * /api/events/{eventId}/attendees/send-invitations:
 *   post:
 *     summary: Send invitations to all attendees
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bulk invitations processed
 */
router.post(
  '/events/:eventId/attendees/send-invitations',
  authorize('Admin'),
  eventPathEventIdValidation,
  validate,
  attendeeController.sendBulkInvitations
);

/**
 * @swagger
 * /api/events/{eventId}/attendees/send-reminders:
 *   post:
 *     summary: Send reminder emails to confirmed attendees
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bulk reminders processed
 */
router.post(
  '/events/:eventId/attendees/send-reminders',
  authorize('Admin'),
  eventPathEventIdValidation,
  validate,
  attendeeController.sendBulkReminders
);

/**
 * @swagger
 * /api/events/{eventId}/attendees/send-thank-you:
 *   post:
 *     summary: Send thank-you emails to checked-in attendees
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Bulk thank-you emails processed
 */
router.post(
  '/events/:eventId/attendees/send-thank-you',
  authorize('Admin'),
  eventPathEventIdValidation,
  validate,
  attendeeController.sendBulkThankYou
);

/**
 * @swagger
 * /api/attendees/{id}:
 *   get:
 *     summary: Get attendee details
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attendee details
 */
router.get('/attendees/:id', attendeeIdValidation, validate, attendeeController.getAttendee);

/**
 * @swagger
 * /api/attendees/{id}:
 *   put:
 *     summary: Update attendee
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attendee updated
 */
router.put(
  '/attendees/:id',
  authorize('Admin'),
  updateAttendeeValidation,
  validate,
  attendeeController.updateAttendee
);

/**
 * @swagger
 * /api/attendees/{id}:
 *   delete:
 *     summary: Delete attendee
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Attendee deleted
 */
router.delete(
  '/attendees/:id',
  authorize('Admin'),
  attendeeIdValidation,
  validate,
  attendeeController.deleteAttendee
);

/**
 * @swagger
 * /api/attendees/{id}/send-invitation:
 *   post:
 *     summary: Send invitation to attendee
 *     tags: [Attendees]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Invitation sent
 */
router.post(
  '/attendees/:id/send-invitation',
  authorize('Admin'),
  attendeeIdValidation,
  validate,
  attendeeController.sendInvitation
);

module.exports = router;
