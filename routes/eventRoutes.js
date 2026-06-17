const express = require('express');
const eventController = require('../controllers/eventController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createEventValidation,
  updateEventValidation,
  eventIdValidation,
} = require('../validators/eventValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Events
 *   description: Event management endpoints
 */

/**
 * @swagger
 * /api/events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, venue, eventDate, eventTime, organizerName, organizerEmail]
 *             properties:
 *               name: { type: string, example: Tech Conference 2026 }
 *               description: { type: string }
 *               venue: { type: string, example: Convention Center }
 *               eventDate: { type: string, format: date, example: 2026-06-15 }
 *               eventTime: { type: string, example: 09:00 }
 *               organizerName: { type: string }
 *               organizerEmail: { type: string }
 *               status: { type: string, enum: [draft, published, archived] }
 *     responses:
 *       201:
 *         description: Event created
 */
router.post('/', authorize('Admin'), createEventValidation, validate, eventController.createEvent);

/**
 * @swagger
 * /api/events:
 *   get:
 *     summary: List events with search and filters
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [draft, published, archived] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated events list
 */
router.get('/', eventController.getEvents);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     summary: Get event details
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event details with stats
 */
router.get('/:id', eventIdValidation, validate, eventController.getEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   put:
 *     summary: Update event
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event updated
 */
router.put('/:id', authorize('Admin'), updateEventValidation, validate, eventController.updateEvent);

/**
 * @swagger
 * /api/events/{id}:
 *   delete:
 *     summary: Delete event
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event deleted
 */
router.delete('/:id', authorize('Admin'), eventIdValidation, validate, eventController.deleteEvent);

/**
 * @swagger
 * /api/events/{id}/archive:
 *   patch:
 *     summary: Archive event
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event archived
 */
router.patch('/:id/archive', authorize('Admin'), eventIdValidation, validate, eventController.archiveEvent);

/**
 * @swagger
 * /api/events/{id}/publish:
 *   patch:
 *     summary: Publish event
 *     tags: [Events]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Event published
 */
router.patch('/:id/publish', authorize('Admin'), eventIdValidation, validate, eventController.publishEvent);

module.exports = router;
