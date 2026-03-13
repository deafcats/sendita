import IORedis from 'ioredis';

let client: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!client) {
    const url = process.env['REDIS_URL'];
    if (!url) throw new Error('REDIS_URL is not set');
    client = new IORedis(url);
  }
  return client;
}
