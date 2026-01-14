import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = new Redis(url);
  }
  return redis;
}

// Generic cache helper with JSON serialization
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const redis = getRedis();

  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const data = await fetcher();
  await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
  return data;
}
