const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const StaffInvite = require('../models/StaffInvite');
const User = require('../models/User');
const { generateResetToken } = require('../utils/jwt');
const config = require('../config');
const emailService = require('./emailService');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createStaffInvite = async ({ email, invitedByUser }) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  if (!normalizedEmail) throw ApiError.badRequest('Email is required');

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw ApiError.conflict('User already exists with this email');
  }

  // One active invite per email.
  await StaffInvite.updateMany(
    { email: normalizedEmail, status: 'pending', expiresAt: { $gt: new Date() } },
    { $set: { status: 'expired' } }
  );

  const { token, hashedToken } = generateResetToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await StaffInvite.create({
    email: normalizedEmail,
    tokenHash: hashedToken,
    invitedBy: invitedByUser._id,
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

const listStaffInvites = async () => {
  const now = new Date();
  await StaffInvite.updateMany(
    { status: 'pending', expiresAt: { $lte: now } },
    { $set: { status: 'expired' } }
  );

  const invites = await StaffInvite.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .select('email status expiresAt createdAt acceptedAt');

  return invites;
};

const consumeInviteForEmail = async ({ email, inviteToken, acceptedByUserId }) => {
  if (!inviteToken) return null;
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

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.acceptedBy = acceptedByUserId;
  await invite.save();

  return invite;
};

module.exports = {
  createStaffInvite,
  listStaffInvites,
  consumeInviteForEmail,
};

