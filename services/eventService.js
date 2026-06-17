const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

const createEvent = async (data, userId) => {
  const event = await Event.create({
    ...data,
    createdBy: userId,
  });
  await cacheService.invalidateAllDashboards();
  return event;
};

const getEvents = async (filters, pagination) => {
  const query = {};

  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.startDate || filters.endDate) {
    query.eventDate = {};
    if (filters.startDate) query.eventDate.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.eventDate.$lte = end;
    }
  }

  const sortField = filters.sortBy || 'eventDate';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

  const [events, total] = await Promise.all([
    Event.find(query)
      .populate('createdBy', 'name email')
      .sort({ [sortField]: sortOrder })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Event.countDocuments(query),
  ]);

  return {
    events,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  };
};

const getEventById = async (eventId) => {
  const event = await Event.findById(eventId).populate('createdBy', 'name email');
  if (!event) {
    throw ApiError.notFound('Event not found');
  }
  return event;
};

const updateEvent = async (eventId, data) => {
  const event = await Event.findByIdAndUpdate(eventId, data, {
    new: true,
    runValidators: true,
  }).populate('createdBy', 'name email');

  if (!event) {
    throw ApiError.notFound('Event not found');
  }

  await cacheService.invalidateAllDashboards();
  return event;
};

const deleteEvent = async (eventId) => {
  const event = await Event.findByIdAndDelete(eventId);
  if (!event) {
    throw ApiError.notFound('Event not found');
  }
  await Attendee.deleteMany({ eventId });
  await cacheService.invalidateAllDashboards();
  return event;
};

const archiveEvent = async (eventId) => {
  return updateEvent(eventId, { status: 'archived' });
};

const publishEvent = async (eventId) => {
  return updateEvent(eventId, { status: 'published' });
};

const getEventStats = async (eventId) => {
  const [total, registered, checkedIn, invitationsSent] = await Promise.all([
    Attendee.countDocuments({ eventId }),
    Attendee.countDocuments({ eventId, registrationStatus: 'confirmed' }),
    Attendee.countDocuments({ eventId, attendanceStatus: 'checked_in' }),
    Attendee.countDocuments({ eventId, invitationStatus: { $ne: 'Cancelled' } }),
  ]);

  return {
    total,
    registered,
    checkedIn,
    invitationsSent,
    attendanceRate: registered > 0 ? Math.round((checkedIn / registered) * 100) : 0,
    registrationRate: total > 0 ? Math.round((registered / total) * 100) : 0,
  };
};

const isEventExpired = (event) => {
  const eventDateTime = new Date(event.eventDate);
  const [hours, minutes] = (event.eventTime || '23:59').split(':').map(Number);
  eventDateTime.setHours(hours || 23, minutes || 59, 59, 999);
  const expiryDate = new Date(eventDateTime);
  expiryDate.setDate(expiryDate.getDate() + 1);
  return new Date() > expiryDate;
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  archiveEvent,
  publishEvent,
  getEventStats,
  isEventExpired,
};
