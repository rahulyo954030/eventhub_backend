const ApiError = require('./ApiError');

const getWorkspaceId = (user) => {
  if (!user) return null;
  if (user.workspaceId) return user.workspaceId.toString();
  if (user.role === 'Admin') return user._id.toString();
  return user._id.toString();
};

const assertWorkspaceMatch = (workspaceId, resourceWorkspaceId) => {
  if (!workspaceId || !resourceWorkspaceId) {
    throw ApiError.forbidden('Access denied');
  }
  if (workspaceId.toString() !== resourceWorkspaceId.toString()) {
    throw ApiError.forbidden('Access denied');
  }
};

module.exports = { getWorkspaceId, assertWorkspaceMatch };
