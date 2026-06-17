const bcrypt = require('bcryptjs');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
} = require('../utils/jwt');
const cloudinaryService = require('./cloudinaryService');
const sessionService = require('./sessionService');
const config = require('../config');

const hashPassword = async (password) => {
  return bcrypt.hash(password, 12);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = config.env === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction && config.isCrossOriginDeployment ? 'none' : isProduction ? 'strict' : 'lax',
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  const isProduction = config.env === 'production';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction && config.isCrossOriginDeployment ? 'none' : isProduction ? 'strict' : 'lax',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

const generateTokens = async (user) => {
  const sessionId = await sessionService.createSession(user._id.toString());
  const payload = { userId: user._id.toString(), sessionId, role: user.role };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await sessionService.storeRefreshToken(user._id.toString(), refreshToken);

  return { accessToken, refreshToken, sessionId };
};

const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role,
  authProvider: user.authProvider,
});

const register = async (data) => {
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('Email already registered');
  }

  // Bootstrap flow:
  // - If no Admin exists yet, auto-promote this signup as Admin.
  // - Otherwise keep default Event Staff unless role is explicitly and validly requested.
  const adminCount = await User.countDocuments({ role: 'Admin' });
  let role = adminCount === 0 ? 'Admin' : 'Event Staff';

  if (adminCount > 0 && data.role === 'Admin') {
    role = 'Event Staff';
  }

  const hashedPassword = await hashPassword(data.password);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,
    role,
    emailVerified: false,
    active: false,
    authProvider: 'local',
  });

  return formatUser(user);
};

const login = async (email, password) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (!user.emailVerified) {
    throw ApiError.unauthorized('Please verify your email before logging in');
  }

  if (!user.active) {
    throw ApiError.unauthorized('Account is deactivated');
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const tokens = await generateTokens(user);
  return { user: formatUser(user), ...tokens };
};

const refreshTokens = async (refreshToken) => {
  if (!refreshToken) {
    throw ApiError.unauthorized('Refresh token required');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid refresh token');
  }

  const storedToken = await sessionService.getRefreshToken(decoded.userId);
  if (storedToken && storedToken !== refreshToken) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const user = await User.findById(decoded.userId);
  if (!user || !user.active) {
    throw ApiError.unauthorized('User not found');
  }

  if (!user.emailVerified) {
    throw ApiError.unauthorized('Please verify your email before logging in');
  }

  // Issue fresh tokens (and session) when refresh JWT is valid.
  // Stored session may be missing after a server restart with in-memory Redis.
  const tokens = await generateTokens(user);
  return { user: formatUser(user), ...tokens };
};

const logout = async (userId, sessionId) => {
  await sessionService.destroySession(sessionId);
  await sessionService.removeRefreshToken(userId);
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return { message: 'If the email exists, a reset link has been sent' };
  }

  const { token, hashedToken } = generateResetToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 3600000;
  await user.save();

  const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
  return { message: 'If the email exists, a reset link has been sent', resetUrl, email: user.email };
};

const normalizeTokenInput = (token, fieldName) => {
  if (typeof token !== 'string') {
    throw ApiError.badRequest(`${fieldName} must be a string`);
  }
  const trimmed = token.trim();
  if (!trimmed) {
    throw ApiError.badRequest(`${fieldName} is required`);
  }
  return trimmed;
};

const resetPassword = async (token, newPassword) => {
  const safeToken = normalizeTokenInput(token, 'Reset token');
  const hashedToken = require('crypto').createHash('sha256').update(safeToken).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired reset token');
  }

  user.password = await hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await sessionService.destroyAllUserSessions(user._id.toString());
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.password) {
    const validCurrent = await comparePassword(currentPassword, user.password);
    if (!validCurrent) {
      throw ApiError.badRequest('Current password is incorrect');
    }
  }

  user.password = await hashPassword(newPassword);
  await user.save();
};

const generateEmailVerification = async (user) => {
  const { token, hashedToken } = generateResetToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save();
  return token;
};

const verifyEmail = async (token) => {
  const safeToken = normalizeTokenInput(token, 'Verification token');
  const hashedToken = require('crypto').createHash('sha256').update(safeToken).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw ApiError.badRequest('Invalid or expired verification token');
  }

  user.emailVerified = true;
  user.active = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return formatUser(user);
};

const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  return formatUser(user);
};

const updateProfile = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (data.name) user.name = data.name;
  await user.save();

  return formatUser(user);
};

const uploadAvatar = async (userId, file) => {
  if (!file?.buffer?.length) {
    throw ApiError.badRequest('Image file is required');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  if (user.avatar) {
    await cloudinaryService.removeUserAvatar(user.avatar);
  }

  const result = await cloudinaryService.uploadUserAvatar(userId, file.buffer);
  user.avatar = result.secure_url;
  await user.save();

  return formatUser(user);
};

const removeAvatar = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  await cloudinaryService.removeUserAvatar(user.avatar);
  user.avatar = '';
  await user.save();

  return formatUser(user);
};

const validateSession = async (userId, sessionId) => {
  const sessionValid = await sessionService.validateSession(sessionId);
  if (!sessionValid) return null;

  const user = await User.findById(userId);
  if (!user || !user.active) return null;

  return formatUser(user);
};

const claimAdminIfNone = async (userId) => {
  const adminCount = await User.countDocuments({ role: 'Admin' });
  if (adminCount > 0) {
    throw ApiError.badRequest('Admin already exists in this workspace');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  user.role = 'Admin';
  user.active = true;
  user.emailVerified = true;
  await user.save();
  return formatUser(user);
};

module.exports = {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  validateSession,
  setAuthCookies,
  clearAuthCookies,
  formatUser,
  generateEmailVerification,
  verifyEmail,
  claimAdminIfNone,
};
