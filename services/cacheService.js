const { getRedisClient } = require('../config/redis');

const CACHE_PREFIX = 'cache:';
const DASHBOARD_PREFIX = 'dashboard:';
const QR_PREFIX = 'qr:';
const DEFAULT_TTL = 300;
const DASHBOARD_TTL = 60;
const QR_TTL = 3600;

const get = async (key) => {
  const redis = getRedisClient();
  const data = await redis.get(`${CACHE_PREFIX}${key}`);
  return data ? JSON.parse(data) : null;
};

const set = async (key, value, ttl = DEFAULT_TTL) => {
  const redis = getRedisClient();
  await redis.setEx(`${CACHE_PREFIX}${key}`, ttl, JSON.stringify(value));
};

const del = async (key) => {
  const redis = getRedisClient();
  await redis.del(`${CACHE_PREFIX}${key}`);
};

const getDashboard = async (userId) => {
  const redis = getRedisClient();
  const data = await redis.get(`${DASHBOARD_PREFIX}${userId}`);
  return data ? JSON.parse(data) : null;
};

const setDashboard = async (userId, data) => {
  const redis = getRedisClient();
  await redis.setEx(`${DASHBOARD_PREFIX}${userId}`, DASHBOARD_TTL, JSON.stringify(data));
};

const invalidateDashboard = async (userId) => {
  const redis = getRedisClient();
  await redis.del(`${DASHBOARD_PREFIX}${userId}`);
};

const invalidateAllDashboards = async () => {
  const redis = getRedisClient();
  const keys = await redis.keys(`${DASHBOARD_PREFIX}*`);
  if (keys.length > 0) {
    await redis.del(keys);
  }
};

const cacheQRValidation = async (qrToken, data) => {
  const redis = getRedisClient();
  await redis.setEx(`${QR_PREFIX}${qrToken}`, QR_TTL, JSON.stringify(data));
};

const getQRValidation = async (qrToken) => {
  const redis = getRedisClient();
  const data = await redis.get(`${QR_PREFIX}${qrToken}`);
  return data ? JSON.parse(data) : null;
};

const invalidateQR = async (qrToken) => {
  const redis = getRedisClient();
  await redis.del(`${QR_PREFIX}${qrToken}`);
};

module.exports = {
  get,
  set,
  del,
  getDashboard,
  setDashboard,
  invalidateDashboard,
  invalidateAllDashboards,
  cacheQRValidation,
  getQRValidation,
  invalidateQR,
};
