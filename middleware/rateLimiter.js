const rateLimit = require('express-rate-limit');

const isDevelopment = process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 2000 : 300,
  skip: (req) =>
    req.path === '/api/health' ||
    req.path.startsWith('/api/register/') ||
    req.path === '/api/auth/validate',
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 300 : 20,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many authentication attempts' },
  standardHeaders: true,
  legacyHeaders: false,
});

const checkInLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'Too many check-in requests' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, checkInLimiter };
