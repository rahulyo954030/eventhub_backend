const XLSX = require('xlsx');
const Event = require('../models/Event');
const Attendee = require('../models/Attendee');
const EmailLog = require('../models/EmailLog');
const ApiError = require('../utils/ApiError');

const buildAttendeeQuery = (filters) => {
  const query = {};
  if (filters.eventId) query.eventId = filters.eventId;
  if (filters.invitationStatus) query.invitationStatus = filters.invitationStatus;
  if (filters.registrationStatus) query.registrationStatus = filters.registrationStatus;
  if (filters.attendanceStatus) query.attendanceStatus = filters.attendanceStatus;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }
  return query;
};

const getEventReport = async (filters) => {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.startDate || filters.endDate) {
    query.eventDate = {};
    if (filters.startDate) query.eventDate.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.eventDate.$lte = end;
    }
  }

  const events = await Event.find(query)
    .populate('createdBy', 'name email')
    .sort({ eventDate: -1 });

  return events.map((e) => ({
    Name: e.name,
    Description: e.description,
    Venue: e.venue,
    Date: new Date(e.eventDate).toISOString().split('T')[0],
    Time: e.eventTime,
    Organizer: e.organizerName,
    'Organizer Email': e.organizerEmail,
    Status: e.status,
    'Created By': e.createdBy?.name || '',
    'Created At': e.createdAt.toISOString(),
  }));
};

const getAttendeeReport = async (filters) => {
  const query = buildAttendeeQuery(filters);
  const attendees = await Attendee.find(query)
    .populate('eventId', 'name')
    .sort({ createdAt: -1 });

  return attendees.map((a) => ({
    'Event': a.eventId?.name || '',
    'Full Name': a.fullName,
    Email: a.email,
    Mobile: a.mobile,
    Company: a.company,
    'Invitation Status': a.invitationStatus,
    'Registration Status': a.registrationStatus,
    'Attendance Status': a.attendanceStatus,
    'Checked In At': a.checkedInAt ? a.checkedInAt.toISOString() : '',
    'Created At': a.createdAt.toISOString(),
  }));
};

const getRegistrationReport = async (filters) => {
  const query = buildAttendeeQuery(filters);
  query.registrationStatus = filters.registrationStatus || 'confirmed';
  const attendees = await Attendee.find(query)
    .populate('eventId', 'name eventDate')
    .sort({ updatedAt: -1 });

  return attendees.map((a) => ({
    'Event': a.eventId?.name || '',
    'Event Date': a.eventId?.eventDate
      ? new Date(a.eventId.eventDate).toISOString().split('T')[0]
      : '',
    'Full Name': a.fullName,
    Email: a.email,
    Mobile: a.mobile,
    Company: a.company,
    'Registration Status': a.registrationStatus,
    'Registered At': a.updatedAt.toISOString(),
  }));
};

const getAttendanceReport = async (filters) => {
  const query = buildAttendeeQuery(filters);
  query.attendanceStatus = 'checked_in';
  const attendees = await Attendee.find(query)
    .populate('eventId', 'name eventDate venue')
    .populate('checkedInBy', 'name')
    .sort({ checkedInAt: -1 });

  return attendees.map((a) => ({
    'Event': a.eventId?.name || '',
    Venue: a.eventId?.venue || '',
    'Full Name': a.fullName,
    Email: a.email,
    Mobile: a.mobile,
    Company: a.company,
    'Checked In At': a.checkedInAt ? a.checkedInAt.toISOString() : '',
    'Checked In By': a.checkedInBy?.name || '',
  }));
};

const exportToCSV = (data) => {
  if (!data || data.length === 0) {
    return '';
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h] ?? '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
};

const exportToExcel = (data, sheetName = 'Report') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

const generateReport = async (reportType, filters, format) => {
  let data;
  let filename;

  switch (reportType) {
    case 'events':
      data = await getEventReport(filters);
      filename = 'event-report';
      break;
    case 'attendees':
      data = await getAttendeeReport(filters);
      filename = 'attendee-report';
      break;
    case 'registrations':
      data = await getRegistrationReport(filters);
      filename = 'registration-report';
      break;
    case 'attendance':
      data = await getAttendanceReport(filters);
      filename = 'attendance-report';
      break;
    default:
      throw ApiError.badRequest('Invalid report type');
  }

  if (format === 'csv') {
    return {
      content: exportToCSV(data),
      contentType: 'text/csv',
      filename: `${filename}.csv`,
    };
  }

  if (format === 'xlsx') {
    return {
      content: exportToExcel(data, reportType),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filename}.xlsx`,
    };
  }

  return { data, filename };
};

module.exports = {
  getEventReport,
  getAttendeeReport,
  getRegistrationReport,
  getAttendanceReport,
  generateReport,
};
