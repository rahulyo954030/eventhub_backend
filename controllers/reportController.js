const reportService = require('../services/reportService');
const { getWorkspaceId } = require('../utils/workspace');
const { asyncHandler, sendSuccess } = require('../utils/helpers');

const getReport = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const { type } = req.params;
  const filters = {
    eventId: req.query.eventId,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    invitationStatus: req.query.invitationStatus,
    registrationStatus: req.query.registrationStatus,
    attendanceStatus: req.query.attendanceStatus,
  };
  const format = req.query.format || 'json';

  if (format === 'json') {
    const result = await reportService.generateReport(type, filters, 'json', workspaceId);
    return sendSuccess(res, result.data);
  }

  const result = await reportService.generateReport(type, filters, format, workspaceId);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.content);
});

module.exports = { getReport };
