import IORedis from 'ioredis';

let client: IORedis | null = null;

export function getRedisClient(): IORedis {
  if (!client) {
    const url = process.env['REDIS_URL'];
    if (!url) throw new Error('REDIS_URL is not set');
    client = new IORedis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return client;
}

export async function setWithTtl(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await getRedisClient().setex(key, ttlSeconds, value);
}

export async function increment(key: string, ttlSeconds: number): Promise<number> {
  const redis = getRedisClient();
  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, ttlSeconds, 'NX');
  const results = await pipeline.exec();
  const count = results?.[0]?.[1];
  return typeof count === 'number' ? count : 0;
}

export async function get(key: string): Promise<string | null> {
  return getRedisClient().get(key);
}

export async function del(key: string): Promise<void> {
  await getRedisClient().del(key);
}

/**
 * Atomically set key=value with TTL only if the key does not already exist.
 * Returns true if the key was set (caller "won" the lock), false if it already existed.
 */
export async function setNx(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<boolean> {
  const result = await getRedisClient().set(key, value, 'EX', ttlSeconds, 'NX');
  return result === 'OK';
}
