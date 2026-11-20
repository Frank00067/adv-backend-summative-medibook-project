require('dotenv').config();
const Redis = require('ioredis');

module.exports = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
});
