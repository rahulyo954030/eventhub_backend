const Attendee = require('../models/Attendee');
const Event = require('../models/Event');
const EmailLog = require('../models/EmailLog');
const ApiError = require('../utils/ApiError');
const qrService = require('./qrService');
const eventService = require('./eventService');
const cacheService = require('./cacheService');

const checkIn = async (scannedData, staffUserId) => {
  let qrPayload;
  try {
    qrPayload = await qrService.validateQRCode(scannedData);
  } catch {
    throw ApiError.badRequest('Invalid QR Code');
  }

  const attendee = await Attendee.findById(qrPayload.attendeeId);
  if (!attendee) {
    throw ApiError.badRequest('Invalid QR Code');
  }

  if (attendee.qrToken !== qrPayload.qrToken) {
    throw ApiError.badRequest('Invalid QR Code');
  }

  if (attendee.eventId.toString() !== qrPayload.eventId) {
    throw ApiError.badRequest('Invalid QR Code');
  }

  const event = await Event.findById(attendee.eventId);
  if (!event) {
    throw ApiError.badRequest('Invalid QR Code');
  }

  if (eventService.isEventExpired(event)) {
    throw ApiError.badRequest('Event Expired');
  }

  if (attendee.attendanceStatus === 'checked_in') {
    return {
      status: 'already_checked_in',
      message: 'Already Checked-In',
      attendee: {
        id: attendee._id,
        fullName: attendee.fullName,
        email: attendee.email,
        mobile: attendee.mobile,
        company: attendee.company,
        checkedInAt: attendee.checkedInAt,
      },
      event: {
        id: event._id,
        name: event.name,
        venue: event.venue,
      },
    };
  }

  attendee.attendanceStatus = 'checked_in';
  attendee.checkedInAt = new Date();
  attendee.checkedInBy = staffUserId;
  await attendee.save();

  await cacheService.invalidateQR(attendee.qrToken);
  await cacheService.invalidateAllDashboards();

  return {
    status: 'success',
    message: 'Check-In Successful',
    attendee: {
      id: attendee._id,
      fullName: attendee.fullName,
      email: attendee.email,
      mobile: attendee.mobile,
      company: attendee.company,
      checkedInAt: attendee.checkedInAt,
    },
    event: {
      id: event._id,
      name: event.name,
      venue: event.venue,
    },
  };
};

module.exports = { checkIn };
