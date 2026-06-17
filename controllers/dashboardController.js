const dashboardService = require('../services/dashboardService');
const { asyncHandler, sendSuccess } = require('../utils/helpers');

const getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardData(req.user._id.toString());
  sendSuccess(res, data);
});

module.exports = { getDashboard };
