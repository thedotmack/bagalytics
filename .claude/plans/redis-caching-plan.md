# Redis Caching Implementation Plan

## Goal
Cache all external API data to reduce unnecessary calls to DexScreener, Birdeye, and Bags SDK.

---

## Phase 0: Documentation & Patterns Confirmed

### Allowed APIs (ioredis)
From `/redis/ioredis` docs:

```typescript
import { Redis } from 'ioredis';

const redis = new Redis(); // localhost:6379
const redis = new Redis(process.env.REDIS_URL); // URL connection

// Set with TTL (60 seconds)
await redis.set("key", "data", "EX", 60);

// Get
const value = await redis.get("key");

// Disconnect
redis.disconnect();
```

### Caching Strategy by Data Type

| Data Source | TTL | Rationale |
|-------------|-----|-----------|
| DexScreener token data | 30s | Real-time price/volume, needs freshness |
| DexScreener SOL price | 60s | Changes slowly, shared across all tokens |
| Birdeye hourly OHLCV | 300s (5min) | Historical data, infrequently updated |
| Bags SDK lifetime fees | 60s | On-chain state, moderate freshness |
| Bags SDK creators | 3600s (1hr) | Rarely changes |

---

## Phase 1: Install ioredis

### Tasks
1. Run `npm install ioredis`
2. Add `REDIS_URL` to `.env.local` (default: `redis://localhost:6379`)

### Verification
```bash
grep ioredis package.json  # Should show dependency
```

---

## Phase 2: Create Redis Client Singleton

### Tasks
Create `src/lib/redis.ts`:

```typescript
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
```

### Verification
```bash
ls src/lib/redis.ts  # File exists
```

---

## Phase 3: Add Caching to Token API Route

### Tasks
Update `src/app/api/token/[address]/route.ts`:

1. Import `getCached` from `@/lib/redis`
2. Wrap each external API call with `getCached()`

### Cache Key Patterns
- `dex:token:{address}` - DexScreener token data (30s TTL)
- `dex:sol-price` - SOL/USD price (60s TTL)
- `birdeye:ohlcv:{address}` - Hourly OHLCV (300s TTL)
- `bags:fees:{address}` - Lifetime fees (60s TTL)
- `bags:creators:{address}` - Token creators (3600s TTL)

### Implementation Pattern
```typescript
// Before
const response = await fetch(`https://api.dexscreener.com/...`);

// After
const data = await getCached(
  `dex:token:${address}`,
  async () => {
    const response = await fetch(`https://api.dexscreener.com/...`);
    return response.json();
  },
  30 // TTL in seconds
);
```

### Verification
```bash
npm run build  # No TypeScript errors
```

---

## Phase 4: Environment Configuration

### Tasks
1. Add to `.env.local`:
   ```
   REDIS_URL=redis://localhost:6379
   ```

2. Add to `.env.example`:
   ```
   REDIS_URL=redis://localhost:6379
   ```

### Verification
```bash
grep REDIS_URL .env.example  # Should exist
```

---

## Phase 5: Final Verification

### Tasks
1. Start Redis locally: `redis-server` or `docker run -p 6379:6379 redis`
2. Run dev server: `npm run dev`
3. Make two requests to same token
4. Check Redis for cached keys: `redis-cli KEYS "*"`

### Expected Behavior
- First request: All external APIs called, data cached
- Second request (within TTL): Data served from Redis, no external calls
- Redis keys visible with pattern `dex:*`, `birdeye:*`, `bags:*`

---

## Anti-Patterns to Avoid
- Do NOT use `redis.setex()` - use `redis.set(key, value, 'EX', ttl)` instead
- Do NOT forget to `JSON.stringify()` objects before storing
- Do NOT cache error responses - only cache successful data
- Do NOT use Redis transactions for simple get/set operations
