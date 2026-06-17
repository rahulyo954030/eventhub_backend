const dashboardService = require('../services/dashboardService');
const { getWorkspaceId } = require('../utils/workspace');
const { asyncHandler, sendSuccess } = require('../utils/helpers');

const getDashboard = asyncHandler(async (req, res) => {
  const workspaceId = getWorkspaceId(req.user);
  const data = await dashboardService.getDashboardData(workspaceId);
  sendSuccess(res, data);
});

module.exports = { getDashboard };
