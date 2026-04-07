const { Pool } = require('pg');
const mongoose = require('mongoose');
const { createClient } = require('redis');

const pgPool = new Pool({
  host:     process.env.POSTGRES_HOST || 'localhost',
  port:     parseInt(process.env.POSTGRES_PORT) || 5432,
  database: process.env.POSTGRES_DB   || 'icms',
  user:     process.env.POSTGRES_USER || 'icms_user',
  password: process.env.POSTGRES_PASSWORD || 'icms123',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 3000,
});
pgPool.on('error', (err) => console.error('[PostgreSQL] Pool error:', err.message));

const connectPostgres = async () => {
  const client = await pgPool.connect();
  console.log('[PostgreSQL] Connected ✓');
  client.release();
};

const connectMongo = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/icms');
  console.log('[MongoDB] Connected ✓');
};

let redisClient = null;
const connectRedis = async () => {
  try {
    redisClient = createClient({
      socket: { host: process.env.REDIS_HOST || 'localhost', port: parseInt(process.env.REDIS_PORT) || 6379, connectTimeout: 3000 }
    });
    redisClient.on('error', () => {});
    await Promise.race([
      redisClient.connect(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);
    console.log('[Redis] Connected ✓');
  } catch {
    console.warn('[Redis] Not available — OTP uses in-memory fallback');
    redisClient = null;
  }
};

const getRedis = () => redisClient;
module.exports = { pgPool, connectPostgres, connectMongo, connectRedis, getRedis };
