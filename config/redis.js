const { createClient } = require('redis');
const config = require('./index');

let redisClient = null;
let loggedFallback = false;

const createInMemoryRedis = () => {
  const store = new Map();
  const ttlTimers = new Map();

  const clearKeyTimer = (key) => {
    const timer = ttlTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      ttlTimers.delete(key);
    }
  };

  return {
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async setEx(key, ttlSeconds, value) {
      store.set(key, value);
      clearKeyTimer(key);
      const timer = setTimeout(() => {
        store.delete(key);
        ttlTimers.delete(key);
      }, ttlSeconds * 1000);
      ttlTimers.set(key, timer);
      return 'OK';
    },
    async del(keys) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      let deleted = 0;
      keyList.forEach((key) => {
        if (store.delete(key)) deleted += 1;
        clearKeyTimer(key);
      });
      return deleted;
    },
    async keys(pattern) {
      const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
      return [...store.keys()].filter((key) => regex.test(key));
    },
    async incr(key) {
      const current = Number(store.get(key) || 0) + 1;
      store.set(key, String(current));
      return current;
    },
    async decr(key) {
      const current = Number(store.get(key) || 0) - 1;
      store.set(key, String(current));
      return current;
    },
    async expire(key, ttlSeconds) {
      if (!store.has(key)) return 0;
      clearKeyTimer(key);
      const timer = setTimeout(() => {
        store.delete(key);
        ttlTimers.delete(key);
      }, ttlSeconds * 1000);
      ttlTimers.set(key, timer);
      return 1;
    },
    async ttl() {
      return 60;
    },
    on() {},
  };
};

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: () => false,
      },
    });
    await redisClient.connect();
    console.log('Redis connected');
    return redisClient;
  } catch (error) {
    if (config.redis.required) {
      console.error('Redis connection error:', error.message);
      process.exit(1);
    }
    redisClient = createInMemoryRedis();
    if (!loggedFallback) {
      console.warn('Redis unavailable. Falling back to in-memory cache/session store.');
      loggedFallback = true;
    }
    return redisClient;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
