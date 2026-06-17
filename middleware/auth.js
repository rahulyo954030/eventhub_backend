const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { asyncHandler } = require('../utils/helpers');
const { verifyAccessToken } = require('../utils/jwt');
const sessionService = require('../services/sessionService');

const authenticate = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw ApiError.unauthorized('Access token required');
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Access token expired');
    }
    throw ApiError.unauthorized('Invalid access token');
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.active) {
    throw ApiError.unauthorized('User not found or inactive');
  }

  const sessionValid = await sessionService.validateSession(decoded.sessionId);
  if (!sessionValid) {
    await sessionService.restoreSession(decoded.sessionId, decoded.userId);
  }

  req.user = user;
  req.sessionId = decoded.sessionId;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.accessToken;

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    const sessionValid = await sessionService.validateSession(decoded.sessionId);
    if (sessionValid) {
      const user = await User.findById(decoded.userId);
      if (user && user.active) {
        req.user = user;
        req.sessionId = decoded.sessionId;
      }
    }
  } catch {
    // Continue without auth
  }

  next();
});

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    next();
  };
};

module.exports = { authenticate, optionalAuth, authorize };
