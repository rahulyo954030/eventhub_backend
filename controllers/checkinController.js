const checkinService = require('../services/checkinService');
const { asyncHandler, sendSuccess } = require('../utils/helpers');

const checkIn = asyncHandler(async (req, res) => {
  const result = await checkinService.checkIn(req.body.qrData, req.user._id);
  sendSuccess(res, result, result.message);
});

module.exports = { checkIn };
