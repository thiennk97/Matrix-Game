import { createClient } from 'redis';

let redisClient = null;

async function connectRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  redisClient = createClient({ url });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected to', url);
  });

  await redisClient.connect();
  return redisClient;
}

function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client is not initialized. Call connectRedis() first.');
  }
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
    console.log('Redis Client Disconnected');
  }
}

export {
  connectRedis,
  getRedisClient,
  disconnectRedis
};
