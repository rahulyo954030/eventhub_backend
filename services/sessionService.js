const { v4: uuidv4 } = require('uuid');
const { getRedisClient } = require('../config/redis');
const config = require('../config');

const SESSION_PREFIX = 'session:';
const REFRESH_PREFIX = 'refresh:';

const getSessionTTL = () => {
  const expiresIn = config.jwt.refreshExpiresIn;
  if (expiresIn.endsWith('d')) return parseInt(expiresIn) * 86400;
  if (expiresIn.endsWith('h')) return parseInt(expiresIn) * 3600;
  if (expiresIn.endsWith('m')) return parseInt(expiresIn) * 60;
  return 604800;
};

const createSession = async (userId) => {
  const redis = getRedisClient();
  const sessionId = uuidv4();
  const ttl = getSessionTTL();

  const sessionData = JSON.stringify({
    userId,
    createdAt: new Date().toISOString(),
  });

  await redis.setEx(`${SESSION_PREFIX}${sessionId}`, ttl, sessionData);
  return sessionId;
};

const validateSession = async (sessionId) => {
  if (!sessionId) return false;
  const redis = getRedisClient();
  const session = await redis.get(`${SESSION_PREFIX}${sessionId}`);
  return !!session;
};

const destroySession = async (sessionId) => {
  if (!sessionId) return;
  const redis = getRedisClient();
  await redis.del(`${SESSION_PREFIX}${sessionId}`);
};

const storeRefreshToken = async (userId, token) => {
  const redis = getRedisClient();
  const ttl = getSessionTTL();
  await redis.setEx(`${REFRESH_PREFIX}${userId}`, ttl, token);
};

const getRefreshToken = async (userId) => {
  const redis = getRedisClient();
  return redis.get(`${REFRESH_PREFIX}${userId}`);
};

const removeRefreshToken = async (userId) => {
  const redis = getRedisClient();
  await redis.del(`${REFRESH_PREFIX}${userId}`);
};

const destroyAllUserSessions = async (userId) => {
  await removeRefreshToken(userId);
};

module.exports = {
  createSession,
  validateSession,
  destroySession,
  storeRefreshToken,
  getRefreshToken,
  removeRefreshToken,
  destroyAllUserSessions,
};
