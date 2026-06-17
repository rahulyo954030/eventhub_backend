const express = require('express');
const checkinController = require('../controllers/checkinController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { checkInLimiter } = require('../middleware/rateLimiter');
const { checkInValidation } = require('../validators/checkinValidator');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Check-In
 *   description: QR check-in endpoints
 */

/**
 * @swagger
 * /api/checkin:
 *   post:
 *     summary: Check in attendee via QR code
 *     tags: [Check-In]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [qrData]
 *             properties:
 *               qrData:
 *                 type: string
 *                 description: Scanned QR code data
 *     responses:
 *       200:
 *         description: Check-in result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     status: { type: string, enum: [success, already_checked_in] }
 *                     message: { type: string }
 *       400:
 *         description: Invalid QR Code or Event Expired
 */
router.post('/', checkInLimiter, checkInValidation, validate, checkinController.checkIn);

module.exports = router;
