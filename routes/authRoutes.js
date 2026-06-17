const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const avatarUpload = require('../middleware/avatarUpload');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  updateProfileValidation,
  verifyEmailValidation,
} = require('../validators/authValidator');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: John Doe }
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: password123 }
 *               role: { type: string, enum: [Admin, Event Staff] }
 *     responses:
 *       201:
 *         description: Registration successful
 *       409:
 *         description: Email already registered
 */
router.post('/register', authLimiter, registerValidation, validate, authController.register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, loginValidation, validate, authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', authController.refresh);

router.post('/clear-session', authController.clearSession);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: john@example.com }
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 */
router.post('/forgot-password', authLimiter, forgotPasswordValidation, validate, authController.forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, example: newpassword123 }
 *     responses:
 *       200:
 *         description: Password reset successful
 */
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string, example: newpassword123 }
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 */
router.get('/profile', authenticate, authController.getProfile);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               avatar: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put('/profile', authenticate, updateProfileValidation, validate, authController.updateProfile);

router.post(
  '/profile/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  authController.uploadAvatar
);

router.delete('/profile/avatar', authenticate, authController.removeAvatar);

/**
 * @swagger
 * /api/auth/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email', verifyEmailValidation, validate, authController.verifyEmail);

/**
 * @swagger
 * /api/auth/claim-admin:
 *   post:
 *     summary: Claim admin role if no admin exists
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user promoted to admin
 *       400:
 *         description: Admin already exists
 */
router.post('/claim-admin', authenticate, authController.claimAdmin);

/**
 * @swagger
 * /api/auth/validate:
 *   get:
 *     summary: Validate current session
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Session validation result
 */
router.get('/validate', authenticate, authController.validateSession);

module.exports = router;
