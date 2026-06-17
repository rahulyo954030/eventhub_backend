const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const StaffInvite = require('../models/StaffInvite');
const User = require('../models/User');
const { generateResetToken } = require('../utils/jwt');
const { getWorkspaceId } = require('../utils/workspace');
const config = require('../config');
const emailService = require('./emailService');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const findPendingInvite = async ({ email, inviteToken }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const tokenHash = hashToken(inviteToken.trim());

  const invite = await StaffInvite.findOne({
    email: normalizedEmail,
    tokenHash,
    status: 'pending',
  });

  if (!invite) {
    throw ApiError.badRequest('Invalid or expired staff invite');
  }

  if (invite.expiresAt <= new Date()) {
    invite.status = 'expired';
    await invite.save();
    throw ApiError.badRequest('Invalid or expired staff invite');
  }

  return invite;
};

const createStaffInvite = async ({ email, invitedByUser }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) throw ApiError.badRequest('Email is required');

  const workspaceId = getWorkspaceId(invitedByUser);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('User already exists with this email');
  }

  await StaffInvite.updateMany(
    { email: normalizedEmail, workspaceId, status: 'pending', expiresAt: { $gt: new Date() } },
    { $set: { status: 'expired' } }
  );

  const { token, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await StaffInvite.create({
    email: normalizedEmail,
    tokenHash: hashedToken,
    invitedBy: invitedByUser._id,
    workspaceId,
    expiresAt,
  });

  const inviteUrl = `${config.frontendUrl}/signup?invite=${token}`;
  await emailService.sendStaffInviteEmail({
    to: normalizedEmail,
    inviterName: invitedByUser.name || 'Admin',
    inviteUrl,
  });

  return {
    id: invite._id,
    email: invite.email,
    status: invite.status,
    expiresAt: invite.expiresAt,
  };
};

const listStaffInvites = async (workspaceId) => {
  const now = new Date();
  await StaffInvite.updateMany(
    { workspaceId, status: 'pending', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );

  const invites = await StaffInvite.find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('email status expiresAt createdAt acceptedAt');

  return invites;
};

const validateInviteForEmail = async ({ email, inviteToken }) => {
  if (!inviteToken) {
    throw ApiError.badRequest('Staff invite is required');
  }

  const invite = await findPendingInvite({ email, inviteToken });
  return {
    invite,
    workspaceId: invite.workspaceId || getWorkspaceId(await User.findById(invite.invitedBy)),
  };
};

const consumeInviteForEmail = async ({ email, inviteToken, acceptedByUserId }) => {
  if (!inviteToken) return null;

  const invite = await findPendingInvite({ email, inviteToken });

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.acceptedBy = acceptedByUserId;
  await invite.save();

  return invite;
};

module.exports = {
  createStaffInvite,
  listStaffInvites,
  validateInviteForEmail,
  consumeInviteForEmail,
};
