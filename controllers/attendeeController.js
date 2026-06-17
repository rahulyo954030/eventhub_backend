const csv = require('csv-parser');
const XLSX = require('xlsx');
const { Readable } = require('stream');
const attendeeService = require('../services/attendeeService');
const { getWorkspaceId } = require('../utils/workspace');
const { asyncHandler, sendSuccess, sendPaginated, parsePagination } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

const createAttendee = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const attendee = await attendeeService.createAttendee(req.params.eventId, req.body, workspaceId);
  sendSuccess(res, attendee, 'Attendee added', 201);
});

const getAttendees = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const pagination = parsePagination(req.query);
  const filters = {
    search: req.query.search,
    invitationStatus: req.query.invitationStatus,
    registrationStatus: req.query.registrationStatus,
    attendanceStatus: req.query.attendanceStatus,
  };
  const result = await attendeeService.getAttendees(req.params.eventId, filters, pagination, workspaceId);
  sendPaginated(res, result.attendees, result.pagination);
});

const getAttendee = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const attendee = await attendeeService.getAttendeeById(req.params.id, workspaceId);
  sendSuccess(res, attendee);
});

const updateAttendee = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const attendee = await attendeeService.updateAttendee(req.params.id, req.body, workspaceId);
  sendSuccess(res, attendee, 'Attendee updated');
});

const deleteAttendee = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  await attendeeService.deleteAttendee(req.params.id, workspaceId);
  sendSuccess(res, null, 'Attendee deleted');
});

const sendInvitation = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const result = await attendeeService.sendInvitation(req.params.id, workspaceId);
  sendSuccess(res, result, result.success ? 'Invitation sent' : 'Failed to send invitation');
});

const sendBulkInvitations = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const result = await attendeeService.sendBulkInvitations(req.params.eventId, workspaceId);
  sendSuccess(res, result, 'Bulk invitations processed');
});

const sendBulkReminders = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const result = await attendeeService.sendBulkReminders(req.params.eventId, workspaceId);
  sendSuccess(res, result, 'Bulk reminders processed');
});

const sendBulkThankYou = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const result = await attendeeService.sendBulkThankYou(req.params.eventId, workspaceId);
  sendSuccess(res, result, 'Bulk thank-you emails processed');
});

const parseCSV = (buffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());
    stream
      .pipe(csv())
      .on('data', (row) => {
        const fullName = row.fullName || row['Full Name'] || row.name || row.Name || '';
        const email = row.email || row.Email || '';
        const mobile = row.mobile || row.Mobile || row.phone || row.Phone || '';
        const company = row.company || row.Company || '';
        if (fullName && email) {
          results.push({ fullName, email, mobile, company });
        }
      })
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

const parseExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  return rows
    .map((row) => ({
      fullName: row.fullName || row['Full Name'] || row.name || row.Name || '',
      email: row.email || row.Email || '',
      mobile: row.mobile || row.Mobile || row.phone || row.Phone || '',
      company: row.company || row.Company || '',
    }))
    .filter((row) => row.fullName && row.email);
};

const bulkUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('File is required');
  }

  const ext = req.file.originalname.toLowerCase();
  let attendees;

  if (ext.endsWith('.csv')) {
    attendees = await parseCSV(req.file.buffer);
  } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
    attendees = parseExcel(req.file.buffer);
  } else {
    throw ApiError.badRequest('Unsupported file format');
  }

  if (attendees.length === 0) {
    throw ApiError.badRequest('No valid attendees found in file');
  }

  const workspaceId = getWorkspaceId(req.user);
  const result = await attendeeService.bulkCreateAttendees(req.params.eventId, attendees, workspaceId);
  sendSuccess(res, result, 'Bulk upload completed');
});

const getRegistration = asyncHandler(async (req, res) => {
  const attendee = await attendeeService.getRegistrationByToken(req.params.token);
  sendSuccess(res, {
    attendee: {
      fullName: attendee.fullName,
      email: attendee.email,
      mobile: attendee.mobile,
      company: attendee.company,
      invitationStatus: attendee.invitationStatus,
      registrationStatus: attendee.registrationStatus,
    },
    event: {
      name: attendee.eventId?.name,
      description: attendee.eventId?.description,
      venue: attendee.eventId?.venue,
      eventDate: attendee.eventId?.eventDate,
      eventTime: attendee.eventId?.eventTime,
      organizerName: attendee.eventId?.organizerName,
    },
  });
});

const getRegistrationQr = asyncHandler(async (req, res) => {
  const qrPng = await attendeeService.getRegistrationQrPng(req.params.token);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.send(qrPng);
});

const confirmRegistration = asyncHandler(async (req, res) => {
  const attendee = await attendeeService.confirmRegistration(req.params.token, req.body);
  sendSuccess(res, attendee, 'Registration confirmed');
});

const cancelRegistration = asyncHandler(async (req, res) => {
  const attendee = await attendeeService.cancelRegistration(req.params.token);
  sendSuccess(res, attendee, 'Registration cancelled');
});

module.exports = {
  createAttendee,
  getAttendees,
  getAttendee,
  updateAttendee,
  deleteAttendee,
  sendInvitation,
  sendBulkInvitations,
  sendBulkReminders,
  sendBulkThankYou,
  bulkUpload,
  getRegistration,
  getRegistrationQr,
  confirmRegistration,
  cancelRegistration,
};
