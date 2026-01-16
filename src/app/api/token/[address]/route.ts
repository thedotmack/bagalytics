import { NextResponse } from 'next/server';
import { BagsSDK } from '@bagsfm/bags-sdk';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getCached } from '@/lib/redis';

// Initialize Bags SDK (lazy, cached)
let bagsSDK: BagsSDK | null = null;

function getBagsSDK(): BagsSDK | null {
  console.log('[TOKEN-API] getBagsSDK called, existing:', !!bagsSDK);
  if (bagsSDK) return bagsSDK;

  const apiKey = process.env.BAGS_API_KEY;
  const rpcUrl = process.env.SOLANA_RPC_URL;

  console.log('[TOKEN-API] Environment check:', {
    hasBagsApiKey: !!apiKey,
    hasSolanaRpcUrl: !!rpcUrl,
    rpcUrlPrefix: rpcUrl ? rpcUrl.substring(0, 30) + '...' : 'NOT SET'
  });

  if (!apiKey || !rpcUrl) {
    console.warn('[TOKEN-API] BAGS_API_KEY or SOLANA_RPC_URL not configured');
    return null;
  }

  console.log('[TOKEN-API] Creating Solana connection and BagsSDK');
  const connection = new Connection(rpcUrl);
  bagsSDK = new BagsSDK(apiKey, connection, 'processed');
  console.log('[TOKEN-API] BagsSDK initialized successfully');
  return bagsSDK;
}

// Token creator interface for Bags SDK response
interface TokenCreator {
  isCreator: boolean;
  provider: string | null;
  providerUsername: string | null;
  username: string | null;
  wallet: string;
  pfp: string | null;
  royaltyBps: number;
}

// Fetch lifetime fees using Bags SDK (returns SOL amount)
async function fetchLifetimeFeesFromBagsSDK(tokenAddress: string): Promise<number> {
  console.log('[TOKEN-API] fetchLifetimeFeesFromBagsSDK:', tokenAddress);
  const sdk = getBagsSDK();
  if (!sdk) {
    console.log('[TOKEN-API] No SDK available, returning 0 for lifetime fees');
    return 0;
  }

  return getCached(
    `bags:fees:${tokenAddress}`,
    async () => {
      console.log('[TOKEN-API] Fetching lifetime fees from Bags SDK...');
      const feesLamports = await sdk.state.getTokenLifetimeFees(new PublicKey(tokenAddress));
      const feesSol = feesLamports / LAMPORTS_PER_SOL;
      console.log('[TOKEN-API] Lifetime fees:', { feesLamports, feesSol });
      return feesSol;
    },
    60
  );
}

// Fetch token creators using Bags SDK
async function fetchTokenCreatorsFromBagsSDK(tokenAddress: string): Promise<TokenCreator[]> {
  console.log('[TOKEN-API] fetchTokenCreatorsFromBagsSDK:', tokenAddress);
  const sdk = getBagsSDK();
  if (!sdk) {
    console.log('[TOKEN-API] No SDK available, returning empty creators array');
    return [];
  }

  return getCached(
    `bags:creators:${tokenAddress}`,
    async () => {
      console.log('[TOKEN-API] Fetching token creators from Bags SDK...');
      const creators = await sdk.state.getTokenCreators(new PublicKey(tokenAddress));
      console.log('[TOKEN-API] Token creators found:', creators.length);
      return creators.map(c => ({
        isCreator: c.isCreator,
        provider: c.provider ?? null,
        providerUsername: c.providerUsername ?? null,
        username: c.username ?? null,
        wallet: c.wallet,
        pfp: c.pfp ?? null,
        royaltyBps: c.royaltyBps,
      }));
    },
    3600
  );
}

// Fetch hourly OHLCV data from Birdeye (last 24 hours)
interface HourlyFee {
  time: string;
  fees: number;
  volume: number;
}

// Raw Birdeye OHLCV data (needs normalization against DexScreener volume)
interface RawBirdeyeOHLCV {
  time: string;
  rawVolume: number;
}

async function fetchRawBirdeyeOHLCV(tokenAddress: string): Promise<RawBirdeyeOHLCV[]> {
  console.log('[TOKEN-API] fetchRawBirdeyeOHLCV:', tokenAddress);
  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    console.warn('[TOKEN-API] BIRDEYE_API_KEY not configured');
    return [];
  }

  return getCached(
    `birdeye:ohlcv:${tokenAddress}`,
    async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 24 * 60 * 60;
      const url = `https://public-api.birdeye.so/defi/ohlcv?address=${tokenAddress}&type=1H&time_from=${oneDayAgo}&time_to=${now}`;

      console.log('[TOKEN-API] Fetching Birdeye OHLCV...');
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      console.log('[TOKEN-API] Birdeye response status:', response.status);
      if (!response.ok) {
        console.warn('[TOKEN-API] Birdeye API error:', response.status, await response.text().catch(() => 'no body'));
        return [];
      }

      const data = await response.json();
      console.log('[TOKEN-API] Birdeye data items:', data.data?.items?.length || 0);

      if (!data.data?.items || !Array.isArray(data.data.items)) {
        console.log('[TOKEN-API] No Birdeye items found');
        return [];
      }

      return data.data.items.map((item: { unixTime: number; v: number }) => {
        const date = new Date(item.unixTime * 1000);
        const hour = date.getHours();
        const timeLabel = hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`;

        return {
          time: timeLabel,
          rawVolume: item.v || 0,
        };
      });
    },
    300
  );
}

// Normalize Birdeye hourly data to match DexScreener's accurate 24h USD volume
// Falls back to synthetic even distribution if Birdeye data unavailable
function normalizeHourlyFees(rawData: RawBirdeyeOHLCV[], dexScreenerVolume24h: number): HourlyFee[] {
  if (dexScreenerVolume24h === 0) return [];

  // If Birdeye has data, normalize it
  if (rawData.length > 0) {
    const totalRawVolume = rawData.reduce((sum, item) => sum + item.rawVolume, 0);
    if (totalRawVolume > 0) {
      const scaleFactor = dexScreenerVolume24h / totalRawVolume;
      return rawData.map(item => {
        const normalizedVolume = item.rawVolume * scaleFactor;
        return {
          time: item.time,
          fees: normalizedVolume * 0.01,
          volume: normalizedVolume,
        };
      });
    }
  }

  // Fallback: generate synthetic hourly data from DexScreener 24h volume
  const avgHourlyVolume = dexScreenerVolume24h / 24;
  const now = new Date();
  const hours: HourlyFee[] = [];

  for (let i = 23; i >= 0; i--) {
    const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = hourDate.getHours();
    const timeLabel = hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`;
    hours.push({
      time: timeLabel,
      fees: avgHourlyVolume * 0.01,
      volume: avgHourlyVolume,
    });
  }

  return hours;
}

// Fetch SOL price in USD from DexScreener
async function fetchSolPriceUsd(): Promise<number> {
  return getCached(
    'dex:sol-price',
    async () => {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
      const data = await response.json();
      if (data.pairs && data.pairs.length > 0) {
        return parseFloat(data.pairs[0].priceUsd) || 0;
      }
      return 0;
    },
    60
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const requestStart = Date.now();

  console.log('[TOKEN-API] ========== REQUEST START ==========');
  console.log('[TOKEN-API] Request URL:', request.url);
  console.log('[TOKEN-API] Token address:', address);
  console.log('[TOKEN-API] Environment check at request time:', {
    REDIS_URL: !!process.env.REDIS_URL,
    BAGS_API_KEY: !!process.env.BAGS_API_KEY,
    SOLANA_RPC_URL: !!process.env.SOLANA_RPC_URL,
    BIRDEYE_API_KEY: !!process.env.BIRDEYE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_URL: process.env.VERCEL_URL || 'NOT SET',
  });

  try {
    console.log('[TOKEN-API] Starting parallel fetches...');
    // Fetch from DexScreener, Bags SDK, SOL price, token creators, and Birdeye in parallel
    const [dexScreenerData, lifetimeFeesSol, solPriceUsd, creators, rawBirdeyeData] = await Promise.all([
      getCached(
        `dex:token:${address}`,
        async () => {
          console.log('[TOKEN-API] Fetching from DexScreener...');
          const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
          console.log('[TOKEN-API] DexScreener response status:', response.status);
          return response.json();
        },
        30
      ),
      fetchLifetimeFeesFromBagsSDK(address),
      fetchSolPriceUsd(),
      fetchTokenCreatorsFromBagsSDK(address),
      fetchRawBirdeyeOHLCV(address)
    ]);

    console.log('[TOKEN-API] All parallel fetches complete:', {
      duration: Date.now() - requestStart,
      hasDexScreenerPairs: !!dexScreenerData?.pairs?.length,
      lifetimeFeesSol,
      solPriceUsd,
      creatorsCount: creators?.length || 0,
      birdeyeDataPoints: rawBirdeyeData?.length || 0
    });

    const result = dexScreenerData;

    if (result.pairs && result.pairs.length > 0) {
      const pair = result.pairs[0];
      const volume24h = pair.volume?.h24 || 0;

      // Normalize Birdeye hourly data to match DexScreener's accurate USD totals
      const hourlyFees = normalizeHourlyFees(rawBirdeyeData, volume24h);
      const volume6h = pair.volume?.h6 || 0;
      const volume1h = pair.volume?.h1 || 0;

      // Calculate velocities for different time windows
      const feeVelocity24h = (volume24h * 0.01) / 24;
      const feeVelocity6h = (volume6h * 0.01) / 6;
      const feeVelocity1h = volume1h * 0.01;

      // Get pair creation date for token age display
      const pairCreatedAt = pair.pairCreatedAt || null;
      let tokenAgeHours = null;

      if (pairCreatedAt) {
        const createdDate = new Date(pairCreatedAt);
        const now = new Date();
        tokenAgeHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
      }

      const responseData = {
        pairAddress: pair.pairAddress,
        tokenName: pair.baseToken?.name || null,
        tokenSymbol: pair.baseToken?.symbol || null,
        tokenImage: pair.info?.imageUrl || null,
        price: parseFloat(pair.priceUsd) || 0,
        volume24h,
        volume6h,
        volume1h,
        liquidity: pair.liquidity?.usd || 0,
        priceChange5m: pair.priceChange?.m5 || 0,
        priceChange1h: pair.priceChange?.h1 || 0,
        priceChange6h: pair.priceChange?.h6 || 0,
        priceChange24h: pair.priceChange?.h24 || 0,
        txns24h: (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0),
        buys24h: pair.txns?.h24?.buys || 0,
        sells24h: pair.txns?.h24?.sells || 0,
        marketCap: pair.marketCap || 0,
        fees24h: volume24h * 0.01,
        fees6h: volume6h * 0.01,
        fees1h: volume1h * 0.01,
        feeVelocity24h,
        feeVelocity6h,
        feeVelocity1h,
        feeVelocity: feeVelocity24h, // Keep for backwards compatibility
        totalFeesAccumulated: volume24h * 0.01,
        pairCreatedAt,
        tokenAgeHours,
        lifetimeFeesSol, // Total creator fees in SOL
        lifetimeFeesUsd: lifetimeFeesSol * solPriceUsd, // Total creator fees in USD
        solPriceUsd, // Current SOL price for reference
        creators, // Token creators from Bags SDK
        hourlyFees // Real hourly fee data from Birdeye
      };

      console.log('[TOKEN-API] ========== REQUEST SUCCESS ==========');
      console.log('[TOKEN-API] Response summary:', {
        tokenName: responseData.tokenName,
        tokenSymbol: responseData.tokenSymbol,
        price: responseData.price,
        volume24h: responseData.volume24h,
        lifetimeFeesUsd: responseData.lifetimeFeesUsd,
        creatorsCount: responseData.creators?.length || 0,
        hourlyFeesCount: responseData.hourlyFees?.length || 0,
        totalDuration: Date.now() - requestStart
      });

      return NextResponse.json(responseData);
    }

    console.log('[TOKEN-API] ========== TOKEN NOT FOUND ==========');
    console.log('[TOKEN-API] DexScreener returned no pairs for:', address);
    return NextResponse.json({ error: 'Token not found' }, { status: 404 });
  } catch (error) {
    console.error('[TOKEN-API] ========== REQUEST ERROR ==========');
    console.error('[TOKEN-API] Error:', error instanceof Error ? error.message : error);
    console.error('[TOKEN-API] Stack:', error instanceof Error ? error.stack : 'no stack');
    console.error('[TOKEN-API] Duration:', Date.now() - requestStart);
    return NextResponse.json({ error: 'Failed to fetch token data' }, { status: 500 });
  }
}
