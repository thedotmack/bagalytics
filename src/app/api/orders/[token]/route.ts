import { LimitOrderProvider } from '@jup-ag/limit-order-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { NextResponse } from 'next/server';

function getRpcEndpoint(): string {
  const endpoint = process.env.SOLANA_RPC_URL;
  if (!endpoint) {
    throw new Error('SOLANA_RPC_URL environment variable required');
  }
  return endpoint;
}

// In-memory cache (server-side)
let ordersCache: { data: any[]; timestamp: number; tokenMint: string } | null = null;
const CACHE_TTL = 60000; // 60 seconds

interface OrderBucket {
  priceLevel: number;
  side: 'buy' | 'sell';
  orderCount: number;
  totalVolumeUsd: number;
  feePotentialUsd: number;
  cumulativeFeesIfSweep: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: tokenMint } = await params;

  // Get current price from query param
  const url = new URL(request.url);
  const currentPriceUsd = parseFloat(url.searchParams.get('price') || '0');

  if (!currentPriceUsd) {
    return NextResponse.json({ error: 'Price parameter required' }, { status: 400 });
  }

  try {
    const connection = new Connection(getRpcEndpoint());
    const limitOrderProvider = new LimitOrderProvider(connection);

    // Check cache
    let orders: any[];
    if (ordersCache &&
        ordersCache.tokenMint === tokenMint &&
        Date.now() - ordersCache.timestamp < CACHE_TTL) {
      orders = ordersCache.data;
    } else {
      // Fetch all orders from Jupiter
      const allOrders = await limitOrderProvider.getOrders();

      // Filter for target token
      orders = allOrders.filter(order => {
        const inputMint = order.account.inputMint.toBase58();
        const outputMint = order.account.outputMint.toBase58();
        return inputMint === tokenMint || outputMint === tokenMint;
      });

      // Cache result
      ordersCache = { data: orders, timestamp: Date.now(), tokenMint };
    }

    // Process orders into buckets
    const { sellBuckets, buyBuckets } = await processOrders(orders, tokenMint, currentPriceUsd, connection);

    return NextResponse.json({ sellBuckets, buyBuckets });
  } catch (error) {
    console.error('Failed to fetch limit orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

async function processOrders(
  orders: any[],
  targetTokenMint: string,
  currentPriceUsd: number,
  connection: Connection
): Promise<{ sellBuckets: OrderBucket[]; buyBuckets: OrderBucket[] }> {
  const sellOrders: Array<{ price: number; volumeUsd: number }> = [];
  const buyOrders: Array<{ price: number; volumeUsd: number }> = [];
  const decimalsCache = new Map<string, number>();

  for (const order of orders) {
    const inputMint = order.account.inputMint.toBase58();
    const outputMint = order.account.outputMint.toBase58();

    // Fetch decimals if not cached
    if (!decimalsCache.has(inputMint)) {
      try {
        const mintInfo = await getMint(connection, new PublicKey(inputMint));
        decimalsCache.set(inputMint, mintInfo.decimals);
      } catch {
        decimalsCache.set(inputMint, 9);
      }
    }
    if (!decimalsCache.has(outputMint)) {
      try {
        const mintInfo = await getMint(connection, new PublicKey(outputMint));
        decimalsCache.set(outputMint, mintInfo.decimals);
      } catch {
        decimalsCache.set(outputMint, 9);
      }
    }

    const inputDecimals = decimalsCache.get(inputMint)!;
    const outputDecimals = decimalsCache.get(outputMint)!;

    const makingAmount = order.account.makingAmount.toNumber() / Math.pow(10, inputDecimals);
    const takingAmount = order.account.takingAmount.toNumber() / Math.pow(10, outputDecimals);

    if (inputMint === targetTokenMint) {
      // SELL order
      const pricePerToken = takingAmount / makingAmount;
      const volumeUsd = makingAmount * currentPriceUsd;
      sellOrders.push({ price: pricePerToken, volumeUsd });
    } else if (outputMint === targetTokenMint) {
      // BUY order
      const pricePerToken = makingAmount / takingAmount;
      const volumeUsd = takingAmount * currentPriceUsd;
      buyOrders.push({ price: pricePerToken, volumeUsd });
    }
  }

  // Bucket by 5% price increments
  const sellBuckets = bucketByPrice(sellOrders, currentPriceUsd, 'sell');
  const buyBuckets = bucketByPrice(buyOrders, currentPriceUsd, 'buy');

  // Calculate cumulative fees
  let cumulative = 0;
  for (const bucket of sellBuckets) {
    cumulative += bucket.feePotentialUsd;
    bucket.cumulativeFeesIfSweep = cumulative;
  }

  cumulative = 0;
  for (const bucket of buyBuckets) {
    cumulative += bucket.feePotentialUsd;
    bucket.cumulativeFeesIfSweep = cumulative;
  }

  return { sellBuckets, buyBuckets };
}

function bucketByPrice(
  orders: Array<{ price: number; volumeUsd: number }>,
  currentPrice: number,
  side: 'buy' | 'sell'
): OrderBucket[] {
  const bucketSize = 0.05; // 5% increments
  const bucketMap = new Map<number, OrderBucket>();

  for (const order of orders) {
    const priceRatio = order.price / currentPrice;
    const bucketIndex = Math.floor(priceRatio / bucketSize) * bucketSize;

    if (!bucketMap.has(bucketIndex)) {
      bucketMap.set(bucketIndex, {
        priceLevel: currentPrice * bucketIndex,
        side,
        orderCount: 0,
        totalVolumeUsd: 0,
        feePotentialUsd: 0,
        cumulativeFeesIfSweep: 0
      });
    }

    const bucket = bucketMap.get(bucketIndex)!;
    bucket.orderCount++;
    bucket.totalVolumeUsd += order.volumeUsd;
    bucket.feePotentialUsd = bucket.totalVolumeUsd * 0.01;
  }

  return Array.from(bucketMap.values()).sort((a, b) =>
    side === 'sell' ? a.priceLevel - b.priceLevel : b.priceLevel - a.priceLevel
  );
}
