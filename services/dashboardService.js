const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const EmailLog = require('../models/EmailLog');
const cacheService = require('./cacheService');

const getWorkspaceEventIds = async (workspaceId) => {
  return Event.find({ workspaceId }).distinct('_id');
};

const getDashboardData = async (workspaceId) => {
  const cached = await cacheService.getDashboard(workspaceId);
  if (cached) return cached;

  const eventIds = await getWorkspaceEventIds(workspaceId);
  const attendeeScope = eventIds.length > 0 ? { eventId: { $in: eventIds } } : { eventId: null };

  const [
    totalEvents,
    totalInvitations,
    totalRegistrations,
    totalCheckIns,
    recentActivities,
    upcomingEvents,
    registrationTrend,
    attendanceTrend,
    eventStatistics,
  ] = await Promise.all([
    Event.countDocuments({ workspaceId, status: { $ne: 'archived' } }),
    Attendee.countDocuments({ ...attendeeScope, invitationStatus: { $ne: 'Cancelled' } }),
    Attendee.countDocuments({ ...attendeeScope, registrationStatus: 'confirmed' }),
    Attendee.countDocuments({ ...attendeeScope, attendanceStatus: 'checked_in' }),
    getRecentActivities(eventIds),
    getUpcomingEvents(workspaceId),
    getRegistrationTrend(eventIds),
    getAttendanceTrend(eventIds),
    getEventStatistics(workspaceId),
  ]);

  const attendancePercentage =
    totalRegistrations > 0 ? Math.round((totalCheckIns / totalRegistrations) * 100) : 0;

  const data = {
    cards: {
      totalEvents,
      totalInvitations,
      totalRegistrations,
      totalCheckIns,
      attendancePercentage,
    },
    charts: {
      registrationTrend,
      attendanceTrend,
      eventStatistics,
    },
    recentActivities,
    upcomingEvents,
  };

  await cacheService.setDashboard(workspaceId, data);
  return data;
};

const getRecentActivities = async (eventIds) => {
  if (!eventIds.length) return [];

  const attendeeScope = { eventId: { $in: eventIds } };

  const [recentRegistrations, recentCheckIns, recentEmails] = await Promise.all([
    Attendee.find({ ...attendeeScope, registrationStatus: 'confirmed' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('eventId', 'name')
      .select('fullName email eventId updatedAt'),
    Attendee.find({ ...attendeeScope, attendanceStatus: 'checked_in' })
      .sort({ checkedInAt: -1 })
      .limit(5)
      .populate('eventId', 'name')
      .select('fullName eventId checkedInAt'),
    EmailLog.find({ eventId: { $in: eventIds }, status: 'sent' })
      .sort({ sentAt: -1 })
      .limit(5)
      .populate('attendeeId', 'fullName email')
      .populate('eventId', 'name'),
  ]);

  const activities = [];

  recentRegistrations.forEach((a) => {
    activities.push({
      type: 'registration',
      message: `${a.fullName} registered for ${a.eventId?.name || 'an event'}`,
      timestamp: a.updatedAt,
    });
  });

  recentCheckIns.forEach((a) => {
    activities.push({
      type: 'checkin',
      message: `${a.fullName} checked in to ${a.eventId?.name || 'an event'}`,
      timestamp: a.checkedInAt,
    });
  });

  recentEmails.forEach((e) => {
    activities.push({
      type: 'email',
      message: `${e.emailType} email sent to ${e.attendeeId?.fullName || 'attendee'}`,
      timestamp: e.sentAt,
    });
  });

  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

const getUpcomingEvents = async (workspaceId) => {
  const now = new Date();
  return Event.find({
    workspaceId,
    eventDate: { $gte: now },
    status: 'published',
  })
    .sort({ eventDate: 1 })
    .limit(5)
    .select('name venue eventDate eventTime status');
};

const getRegistrationTrend = async (eventIds) => {
  if (!eventIds.length) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trend = await Attendee.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        registrationStatus: 'confirmed',
        updatedAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trend.map((t) => ({ date: t._id, count: t.count }));
};

const getAttendanceTrend = async (eventIds) => {
  if (!eventIds.length) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trend = await Attendee.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        attendanceStatus: 'checked_in',
        checkedInAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$checkedInAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trend.map((t) => ({ date: t._id, count: t.count }));
};

const getEventStatistics = async (workspaceId) => {
  const events = await Event.find({ workspaceId, status: { $ne: 'archived' } })
    .sort({ eventDate: -1 })
    .limit(10)
    .select('name');

  const stats = [];
  for (const event of events) {
    const [total, registered, checkedIn] = await Promise.all([
      Attendee.countDocuments({ eventId: event._id }),
      Attendee.countDocuments({ eventId: event._id, registrationStatus: 'confirmed' }),
      Attendee.countDocuments({ eventId: event._id, attendanceStatus: 'checked_in' }),
    ]);
    stats.push({
      eventName: event.name,
      total,
      registered,
      checkedIn,
    });
  }

  return stats;
};

module.exports = { getDashboardData };
