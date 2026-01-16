import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('[REDIS] Initializing connection:', {
      hasRedisUrl: !!process.env.REDIS_URL,
      urlPrefix: url.substring(0, 20) + '...'
    });
    redis = new Redis(url);

    redis.on('connect', () => {
      console.log('[REDIS] Connected successfully');
    });

    redis.on('error', (err) => {
      console.error('[REDIS] Connection error:', err.message);
    });

    redis.on('ready', () => {
      console.log('[REDIS] Ready to accept commands');
    });
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
  const startTime = Date.now();

  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log('[REDIS] Cache HIT:', { key, ttl: ttlSeconds, duration: Date.now() - startTime });
      return JSON.parse(cached) as T;
    }

    console.log('[REDIS] Cache MISS:', { key, ttl: ttlSeconds });
    const data = await fetcher();
    await redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
    console.log('[REDIS] Cache SET:', { key, ttl: ttlSeconds, duration: Date.now() - startTime });
    return data;
  } catch (error) {
    console.error('[REDIS] Cache error:', { key, error: error instanceof Error ? error.message : error });
    // Fallback to fetcher on cache error
    console.log('[REDIS] Falling back to direct fetch for:', key);
    return fetcher();
  }
}
