const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { asyncHandler, sendSuccess } = require('../utils/helpers');

const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  // Generate verification token and send email
  const fullUser = await require('../models/User').findOne({ email: user.email });
  if (fullUser) {
    const token = await authService.generateEmailVerification(fullUser);
    const verificationUrl = `${require('../config').frontendUrl}/verify-email?token=${token}`;
    await emailService.sendEmailVerification(fullUser, verificationUrl);
  }
  sendSuccess(res, user, 'Registration successful. Please verify your email.', 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body.email, req.body.password);
  authService.setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, { user: result.user }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const result = await authService.refreshTokens(refreshToken);
  authService.setAuthCookies(res, result.accessToken, result.refreshToken);
  sendSuccess(res, { user: result.user }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id.toString(), req.sessionId);
  authService.clearAuthCookies(res);
  sendSuccess(res, null, 'Logout successful');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  if (result.resetUrl && result.email) {
    await emailService.sendPasswordResetEmail(result.email, result.resetUrl);
  }
  sendSuccess(res, null, result.message);
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  sendSuccess(res, null, 'Password reset successful');
});

const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword
  );
  sendSuccess(res, null, 'Password changed successfully');
});

const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  sendSuccess(res, user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  sendSuccess(res, user, 'Profile updated');
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await authService.uploadAvatar(req.user._id, req.file);
  sendSuccess(res, user, 'Profile photo updated');
});

const removeAvatar = asyncHandler(async (req, res) => {
  const user = await authService.removeAvatar(req.user._id);
  sendSuccess(res, user, 'Profile photo removed');
});

const validateSession = asyncHandler(async (req, res) => {
  const user = await authService.validateSession(req.user._id, req.sessionId);
  sendSuccess(res, { user, valid: !!user });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const verifiedUser = await authService.verifyEmail(req.body.token);
  sendSuccess(res, verifiedUser, 'Email verified successfully');
});

const claimAdmin = asyncHandler(async (req, res) => {
  const user = await authService.claimAdminIfNone(req.user._id);
  sendSuccess(res, user, 'You are now the workspace admin');
});

const clearSession = asyncHandler(async (req, res) => {
  authService.clearAuthCookies(res);
  sendSuccess(res, null, 'Session cleared');
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  clearSession,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
  validateSession,
  verifyEmail,
  claimAdmin,
};
