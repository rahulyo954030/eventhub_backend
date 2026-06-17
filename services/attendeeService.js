const Attendee = require('../models/Attendee');
const Event = require('../models/Event');
const ApiError = require('../utils/ApiError');
const config = require('../config');
const { generateRegistrationToken, generateSecureToken } = require('../utils/token');
const qrService = require('./qrService');
const emailService = require('./emailService');
const cacheService = require('./cacheService');

const getQrImageUrl = (registrationToken) =>
  `${config.qr.imageBaseUrl}/api/register/${registrationToken}/qr`;

const ensureAttendeeQrCode = async (attendee, forceRegenerate = false) => {
  if (!forceRegenerate && attendee.qrCodeUrl && attendee.qrCodeUrl.startsWith('data:image/')) {
    return attendee.qrCodeUrl;
  }
  const { qrCodeUrl } = await qrService.createAttendeeQR(attendee._id, attendee.eventId, attendee.qrToken);
  attendee.qrCodeUrl = qrCodeUrl;
  await attendee.save();
  return qrCodeUrl;
};

const createAttendee = async (eventId, data, sendInvite = true) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const existing = await Attendee.findOne({ eventId, email: data.email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('Attendee with this email already exists for this event');
  }

  const registrationToken = generateRegistrationToken();
  const qrToken = generateSecureToken();

  const attendee = await Attendee.create({
    eventId,
    fullName: data.fullName,
    email: data.email.toLowerCase(),
    mobile: data.mobile || '',
    company: data.company || '',
    registrationToken,
    qrToken,
  });

  await ensureAttendeeQrCode(attendee);

  if (sendInvite) {
    const registrationUrl = qrService.getRegistrationUrl(registrationToken);
    const qrImageUrl = getQrImageUrl(registrationToken);
    await emailService.sendInvitationEmail(
      attendee,
      event,
      registrationUrl,
      qrImageUrl,
      attendee.qrCodeUrl
    );
  }

  await cacheService.invalidateAllDashboards();
  return attendee;
};

const bulkCreateAttendees = async (eventId, attendeesData) => {
  const results = { created: 0, failed: [], duplicates: 0 };

  for (const data of attendeesData) {
    try {
      await createAttendee(eventId, data, false);
      results.created++;
    } catch (error) {
      if (error.statusCode === 409) {
        results.duplicates++;
      } else {
        results.failed.push({ email: data.email, error: error.message });
      }
    }
  }

  await cacheService.invalidateAllDashboards();
  return results;
};

const getAttendees = async (eventId, filters, pagination) => {
  const query = { eventId };

  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  if (filters.invitationStatus) {
    query.invitationStatus = filters.invitationStatus;
  }
  if (filters.registrationStatus) {
    query.registrationStatus = filters.registrationStatus;
  }
  if (filters.attendanceStatus) {
    query.attendanceStatus = filters.attendanceStatus;
  }

  const [attendees, total] = await Promise.all([
    Attendee.find(query)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Attendee.countDocuments(query),
  ]);

  return {
    attendees,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getAttendeeById = async (attendeeId) => {
  const attendee = await Attendee.findById(attendeeId).populate('eventId');
  if (!attendee) {
    throw ApiError.notFound('Attendee not found');
  }
  return attendee;
};

const updateAttendee = async (attendeeId, data) => {
  const attendee = await Attendee.findByIdAndUpdate(
    attendeeId,
    {
      fullName: data.fullName,
      email: data.email?.toLowerCase(),
      mobile: data.mobile,
      company: data.company,
    },
    { new: true, runValidators: true }
  );

  if (!attendee) {
    throw ApiError.notFound('Attendee not found');
  }

  await cacheService.invalidateAllDashboards();
  return attendee;
};

const deleteAttendee = async (attendeeId) => {
  const attendee = await Attendee.findByIdAndDelete(attendeeId);
  if (!attendee) {
    throw ApiError.notFound('Attendee not found');
  }
  await cacheService.invalidateQR(attendee.qrToken);
  await cacheService.invalidateAllDashboards();
  return attendee;
};

const sendInvitation = async (attendeeId) => {
  const attendee = await Attendee.findById(attendeeId);
  if (!attendee) {
    throw ApiError.notFound('Attendee not found');
  }

  const event = await Event.findById(attendee.eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const registrationUrl = qrService.getRegistrationUrl(attendee.registrationToken);
  const qrImageUrl = getQrImageUrl(attendee.registrationToken);
  await ensureAttendeeQrCode(attendee, true);
  const result = await emailService.sendInvitationEmail(
    attendee,
    event,
    registrationUrl,
    qrImageUrl,
    attendee.qrCodeUrl
  );

  return result;
};

const sendBulkInvitations = async (eventId) => {
  const attendees = await Attendee.find({
    eventId,
    invitationStatus: { $ne: 'Cancelled' },
  });
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const results = { sent: 0, failed: 0 };
  for (const attendee of attendees) {
    const registrationUrl = qrService.getRegistrationUrl(attendee.registrationToken);
    const qrImageUrl = getQrImageUrl(attendee.registrationToken);
    await ensureAttendeeQrCode(attendee, true);
    const result = await emailService.sendInvitationEmail(
      attendee,
      event,
      registrationUrl,
      qrImageUrl,
      attendee.qrCodeUrl
    );
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }
  }

  return results;
};

const sendBulkReminders = async (eventId) => {
  const attendees = await Attendee.find({
    eventId,
    registrationStatus: 'confirmed',
    invitationStatus: { $ne: 'Cancelled' },
  });
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const results = { sent: 0, failed: 0 };
  for (const attendee of attendees) {
    const result = await emailService.sendReminderEmail(attendee, event);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }
  }

  return results;
};

const sendBulkThankYou = async (eventId) => {
  const attendees = await Attendee.find({
    eventId,
    attendanceStatus: 'checked_in',
  });
  const event = await Event.findById(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  const results = { sent: 0, failed: 0 };
  for (const attendee of attendees) {
    const result = await emailService.sendThankYouEmail(attendee, event);
    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
    }
  }

  return results;
};

const getRegistrationByToken = async (token) => {
  const attendee = await Attendee.findOne({ registrationToken: token }).populate('eventId');
  if (!attendee) {
    throw ApiError.notFound('Invalid registration link');
  }
  return attendee;
};

const getRegistrationQrPng = async (token) => {
  const attendee = await Attendee.findOne({ registrationToken: token });
  if (!attendee) {
    throw ApiError.notFound('Invalid registration link');
  }

  const qrCodeUrl = await ensureAttendeeQrCode(attendee);
  const pngPrefix = 'data:image/png;base64,';
  if (!qrCodeUrl.startsWith(pngPrefix)) {
    throw ApiError.internal('Invalid QR image data');
  }

  return Buffer.from(qrCodeUrl.slice(pngPrefix.length), 'base64');
};

const confirmRegistration = async (token, data) => {
  const attendee = await Attendee.findOne({ registrationToken: token });
  if (!attendee) {
    throw ApiError.notFound('Invalid registration link');
  }

  if (attendee.invitationStatus === 'Cancelled') {
    throw ApiError.badRequest('Registration has been cancelled');
  }

  attendee.fullName = data.fullName || attendee.fullName;
  attendee.email = (data.email || attendee.email).toLowerCase();
  attendee.mobile = data.mobile || attendee.mobile;
  attendee.company = data.company || attendee.company;
  attendee.invitationStatus = 'Registered';
  attendee.registrationStatus = 'confirmed';
  await attendee.save();

  const event = await Event.findById(attendee.eventId);
  if (event) {
    await emailService.sendRegistrationConfirmation(attendee, event);
  }

  await cacheService.invalidateAllDashboards();
  return attendee;
};

const cancelRegistration = async (token) => {
  const attendee = await Attendee.findOne({ registrationToken: token });
  if (!attendee) {
    throw ApiError.notFound('Invalid registration link');
  }

  attendee.invitationStatus = 'Cancelled';
  attendee.registrationStatus = 'cancelled';
  await attendee.save();

  await cacheService.invalidateAllDashboards();
  return attendee;
};

module.exports = {
  createAttendee,
  bulkCreateAttendees,
  getAttendees,
  getAttendeeById,
  updateAttendee,
  deleteAttendee,
  sendInvitation,
  sendBulkInvitations,
  sendBulkReminders,
  sendBulkThankYou,
  getRegistrationByToken,
  getRegistrationQrPng,
  confirmRegistration,
  cancelRegistration,
};
