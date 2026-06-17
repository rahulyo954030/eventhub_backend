const eventService = require('../services/eventService');
const { asyncHandler, sendSuccess, sendPaginated, parsePagination } = require('../utils/helpers');

const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(req.body, req.user._id);
  sendSuccess(res, event, 'Event created', 201);
});

const getEvents = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const filters = {
    search: req.query.search,
    status: req.query.status,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };
  const result = await eventService.getEvents(filters, pagination);
  sendPaginated(res, result.events, result.pagination);
});

const getEvent = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);
  const stats = await eventService.getEventStats(req.params.id);
  sendSuccess(res, { event, stats });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await eventService.updateEvent(req.params.id, req.body);
  sendSuccess(res, event, 'Event updated');
});

const deleteEvent = asyncHandler(async (req, res) => {
  await eventService.deleteEvent(req.params.id);
  sendSuccess(res, null, 'Event deleted');
});

const archiveEvent = asyncHandler(async (req, res) => {
  const event = await eventService.archiveEvent(req.params.id);
  sendSuccess(res, event, 'Event archived');
});

const publishEvent = asyncHandler(async (req, res) => {
  const event = await eventService.publishEvent(req.params.id);
  sendSuccess(res, event, 'Event published');
});

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  archiveEvent,
  publishEvent,
};
