const express = require('express');
const reportController = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('Admin'));

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Report generation and export endpoints
 */

/**
 * @swagger
 * /api/reports/{type}:
 *   get:
 *     summary: Generate and export reports
 *     tags: [Reports]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [events, attendees, registrations, attendance]
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, xlsx]
 *           default: json
 *       - in: query
 *         name: eventId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Report data or file download
 */
router.get('/:type', reportController.getReport);

module.exports = router;
