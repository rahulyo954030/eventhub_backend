const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const EmailLog = require('../models/EmailLog');
const cacheService = require('./cacheService');

const getDashboardData = async (userId) => {
  const cached = await cacheService.getDashboard(userId);
  if (cached) return cached;

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
    Event.countDocuments({ status: { $ne: 'archived' } }),
    Attendee.countDocuments({ invitationStatus: { $ne: 'Cancelled' } }),
    Attendee.countDocuments({ registrationStatus: 'confirmed' }),
    Attendee.countDocuments({ attendanceStatus: 'checked_in' }),
    getRecentActivities(),
    getUpcomingEvents(),
    getRegistrationTrend(),
    getAttendanceTrend(),
    getEventStatistics(),
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

  await cacheService.setDashboard(userId, data);
  return data;
};

const getRecentActivities = async () => {
  const [recentRegistrations, recentCheckIns, recentEmails] = await Promise.all([
    Attendee.find({ registrationStatus: 'confirmed' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('eventId', 'name')
      .select('fullName email eventId updatedAt'),
    Attendee.find({ attendanceStatus: 'checked_in' })
      .sort({ checkedInAt: -1 })
      .limit(5)
      .populate('eventId', 'name')
      .select('fullName eventId checkedInAt'),
    EmailLog.find({ status: 'sent' })
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

const getUpcomingEvents = async () => {
  const now = new Date();
  return Event.find({
    eventDate: { $gte: now },
    status: 'published',
  })
    .sort({ eventDate: 1 })
    .limit(5)
    .select('name venue eventDate eventTime status');
};

const getRegistrationTrend = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trend = await Attendee.aggregate([
    {
      $match: {
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

const getAttendanceTrend = async () => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const trend = await Attendee.aggregate([
    {
      $match: {
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

const getEventStatistics = async () => {
  const events = await Event.find({ status: { $ne: 'archived' } })
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
