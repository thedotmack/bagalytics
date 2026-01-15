import { NextResponse } from 'next/server';

export interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  priceChange24h: number;
}

interface JupiterAsset {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  stats24h?: {
    priceChange?: number;
  };
}

export async function GET() {
  try {
    const response = await fetch(
      'https://datapi.jup.ag/v1/assets/toptraded/24h?launchpads=bags.fun&limit=15',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Bagalytics/1.0',
        },
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      console.error('Jupiter API error:', response.status, response.statusText);
      return NextResponse.json({ tokens: [] }, { status: 200 });
    }

    // Jupiter returns a flat array of assets
    const data: JupiterAsset[] = await response.json();

    const tokens: TrendingToken[] = data.map((asset) => ({
      address: asset.id,
      symbol: asset.symbol || 'UNKNOWN',
      name: asset.name || 'Unknown Token',
      logoURI: asset.icon || null,
      priceChange24h: asset.stats24h?.priceChange ?? 0,
    }));

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Failed to fetch trending tokens:', error);
    return NextResponse.json({ tokens: [] }, { status: 200 });
  }
}
