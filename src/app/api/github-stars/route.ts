import { NextResponse } from 'next/server';
import { getCached, getRedis } from '@/lib/redis';

const GITHUB_REPO = 'thedotmack/claude-mem';
const CACHE_KEY = 'github:stars:claude-mem';

export async function GET() {
  try {
    const stars = await getCached(
      CACHE_KEY,
      async () => {
        const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Bagalytics/1.0',
          },
        });

        if (!response.ok) {
          console.error('GitHub API error:', response.status);
          return null;
        }

        const data = await response.json();
        return data.stargazers_count ?? null;
      },
      3600 // Cache for 1 hour
    );

    return NextResponse.json({ stars });
  } catch (error) {
    console.error('Failed to fetch GitHub stars:', error);
    return NextResponse.json({ stars: null }, { status: 200 });
  }
}

// DELETE to clear the cache (for fixing bad cached values)
export async function DELETE() {
  try {
    const redis = getRedis();
    await redis.del(CACHE_KEY);
    return NextResponse.json({ cleared: true });
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 });
  }
}
