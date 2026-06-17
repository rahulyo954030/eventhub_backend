const express = require('express');
const attendeeController = require('../controllers/attendeeController');
const validate = require('../middleware/validate');
const {
  registrationValidation,
  registrationTokenValidation,
} = require('../validators/attendeeValidator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Registration
 *   description: Public registration portal endpoints
 */

/**
 * @swagger
 * /api/register/{token}/qr:
 *   get:
 *     summary: Get attendee QR image by registration token
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: QR code PNG image
 *       404:
 *         description: Invalid registration link
 */
router.get('/:token/qr', registrationTokenValidation, validate, attendeeController.getRegistrationQr);

/**
 * @swagger
 * /api/register/{token}:
 *   get:
 *     summary: Get registration details by token
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Registration details
 *       404:
 *         description: Invalid registration link
 */
router.get('/:token', registrationTokenValidation, validate, attendeeController.getRegistration);

/**
 * @swagger
 * /api/register/{token}/confirm:
 *   post:
 *     summary: Confirm registration
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, email, mobile]
 *             properties:
 *               fullName: { type: string }
 *               email: { type: string }
 *               mobile: { type: string }
 *               company: { type: string }
 *     responses:
 *       200:
 *         description: Registration confirmed
 */
router.post(
  '/:token/confirm',
  registrationTokenValidation,
  registrationValidation,
  validate,
  attendeeController.confirmRegistration
);

/**
 * @swagger
 * /api/register/{token}/cancel:
 *   post:
 *     summary: Cancel registration
 *     tags: [Registration]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Registration cancelled
 */
router.post(
  '/:token/cancel',
  registrationTokenValidation,
  validate,
  attendeeController.cancelRegistration
);

module.exports = router;
