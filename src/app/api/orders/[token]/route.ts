import { Connection, PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { NextResponse } from 'next/server';
import BN from 'bn.js';

// Jupiter Limit Order V2 Program ID (from jup-limit-orders.md)
const JUP_LIMIT_ORDER_V2_PROGRAM_ID = new PublicKey('j1o2qRpjcyUwEvwtcfhEQefh773ZgjxcVRry7LDqg5X');

// Account Layout Offsets (V2) per jup-limit-orders.md:
// - Discriminator: 8 bytes (offset 0)
// - Maker (User): 32 bytes (offset 8)
// - Input Mint: 32 bytes (offset 40)
// - Output Mint: 32 bytes (offset 72)
const INPUT_MINT_OFFSET = 40;
const OUTPUT_MINT_OFFSET = 72;

// Making/Taking amount offsets (verified from Jupiter IDL/Carbon decoder)
const MAKING_AMOUNT_OFFSET = 224;
const TAKING_AMOUNT_OFFSET = 232;

// Token and fee constants
const DEFAULT_SPL_TOKEN_DECIMALS = 9;
const PRICE_BUCKET_PERCENTAGE = 0.05; // 5% increments
const BAGS_CREATOR_FEE_RATE = 0.01;   // 1% creator fee

function getRpcEndpoint(): string {
  const endpoint = process.env.SOLANA_RPC_URL;
  if (!endpoint) {
    throw new Error('SOLANA_RPC_URL environment variable required');
  }
  return endpoint;
}

// In-memory cache (server-side)
let ordersCache: { data: ParsedLimitOrder[]; timestamp: number; tokenMint: string } | null = null;
const CACHE_TTL = 60000; // 60 seconds

interface ParsedLimitOrder {
  publicKey: string;
  inputMint: string;
  outputMint: string;
  makingAmount: BN;
  takingAmount: BN;
}

interface OrderBucket {
  priceLevel: number;
  side: 'buy' | 'sell';
  orderCount: number;
  totalVolumeUsd: number;
  feePotentialUsd: number;
  cumulativeFeesIfSweep: number;
}

/**
 * Fetch all Jupiter Limit Order V2 accounts where the token is the input mint (sell orders).
 * Uses RPC getProgramAccounts with memcmp filter at offset 40.
 */
async function fetchSellOrdersViaRpc(connection: Connection, tokenMint: string): Promise<ParsedLimitOrder[]> {
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: INPUT_MINT_OFFSET,
        bytes: tokenMint,
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(JUP_LIMIT_ORDER_V2_PROGRAM_ID, { filters });

  return accounts.map((account) => parseOrderAccount(account.pubkey.toBase58(), account.account.data));
}

/**
 * Fetch all Jupiter Limit Order V2 accounts where the token is the output mint (buy orders).
 * Uses RPC getProgramAccounts with memcmp filter at offset 72.
 */
async function fetchBuyOrdersViaRpc(connection: Connection, tokenMint: string): Promise<ParsedLimitOrder[]> {
  const filters: GetProgramAccountsFilter[] = [
    {
      memcmp: {
        offset: OUTPUT_MINT_OFFSET,
        bytes: tokenMint,
      },
    },
  ];

  const accounts = await connection.getProgramAccounts(JUP_LIMIT_ORDER_V2_PROGRAM_ID, { filters });

  return accounts.map((account) => parseOrderAccount(account.pubkey.toBase58(), account.account.data));
}

/**
 * Parse a Jupiter Limit Order V2 account data buffer into a structured order object.
 * Layout per jup-limit-orders.md:
 * - Discriminator: 8 bytes (offset 0)
 * - Maker: 32 bytes (offset 8)
 * - Input Mint: 32 bytes (offset 40)
 * - Output Mint: 32 bytes (offset 72)
 * - makingAmount: u64 (offset 120)
 * - takingAmount: u64 (offset 128)
 */
function parseOrderAccount(publicKey: string, data: Buffer): ParsedLimitOrder {
  const inputMint = new PublicKey(data.subarray(INPUT_MINT_OFFSET, INPUT_MINT_OFFSET + 32)).toBase58();
  const outputMint = new PublicKey(data.subarray(OUTPUT_MINT_OFFSET, OUTPUT_MINT_OFFSET + 32)).toBase58();

  // Read u64 values as little-endian
  const makingAmount = new BN(data.subarray(MAKING_AMOUNT_OFFSET, MAKING_AMOUNT_OFFSET + 8), 'le');
  const takingAmount = new BN(data.subarray(TAKING_AMOUNT_OFFSET, TAKING_AMOUNT_OFFSET + 8), 'le');

  return {
    publicKey,
    inputMint,
    outputMint,
    makingAmount,
    takingAmount,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: tokenMint } = await params;

  // Validate token mint is a valid PublicKey
  try {
    new PublicKey(tokenMint);
  } catch {
    return NextResponse.json({ error: 'Invalid token mint address' }, { status: 400 });
  }

  // Get current price from query param
  const url = new URL(request.url);
  const currentPriceUsd = parseFloat(url.searchParams.get('price') || '0');

  if (!currentPriceUsd) {
    return NextResponse.json({ error: 'Price parameter required' }, { status: 400 });
  }

  try {
    const connection = new Connection(getRpcEndpoint());

    // Check cache
    let orders: ParsedLimitOrder[];
    if (ordersCache &&
        ordersCache.tokenMint === tokenMint &&
        Date.now() - ordersCache.timestamp < CACHE_TTL) {
      orders = ordersCache.data;
    } else {
      // Fetch orders using direct RPC getProgramAccounts with memcmp filters
      // This is more reliable than the SDK approach per jup-limit-orders.md
      const [sellOrders, buyOrders] = await Promise.all([
        fetchSellOrdersViaRpc(connection, tokenMint),
        fetchBuyOrdersViaRpc(connection, tokenMint),
      ]);

      // Combine and dedupe orders (some may appear in both if same pair)
      const orderMap = new Map<string, ParsedLimitOrder>();
      for (const order of [...sellOrders, ...buyOrders]) {
        orderMap.set(order.publicKey, order);
      }
      orders = Array.from(orderMap.values());

      // Cache result
      ordersCache = { data: orders, timestamp: Date.now(), tokenMint };
    }

    // Process orders into buckets
    const { sellBuckets, buyBuckets } = await processOrders(orders, tokenMint, currentPriceUsd, connection);

    return NextResponse.json({ sellBuckets, buyBuckets });
  } catch (error) {
    console.error('[Orders] Failed to fetch limit orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

async function processOrders(
  orders: ParsedLimitOrder[],
  targetTokenMint: string,
  currentPriceUsd: number,
  connection: Connection
): Promise<{ sellBuckets: OrderBucket[]; buyBuckets: OrderBucket[] }> {
  const sellOrders: Array<{ price: number; volumeUsd: number }> = [];
  const buyOrders: Array<{ price: number; volumeUsd: number }> = [];
  const decimalsCache = new Map<string, number>();

  for (const order of orders) {
    const { inputMint, outputMint, makingAmount, takingAmount } = order;

    // Fetch decimals if not cached
    if (!decimalsCache.has(inputMint)) {
      try {
        const mintInfo = await getMint(connection, new PublicKey(inputMint));
        decimalsCache.set(inputMint, mintInfo.decimals);
      } catch {
        decimalsCache.set(inputMint, DEFAULT_SPL_TOKEN_DECIMALS);
      }
    }
    if (!decimalsCache.has(outputMint)) {
      try {
        const mintInfo = await getMint(connection, new PublicKey(outputMint));
        decimalsCache.set(outputMint, mintInfo.decimals);
      } catch {
        decimalsCache.set(outputMint, DEFAULT_SPL_TOKEN_DECIMALS);
      }
    }

    const inputDecimals = decimalsCache.get(inputMint)!;
    const outputDecimals = decimalsCache.get(outputMint)!;

    const makingAmountNormalized = makingAmount.toNumber() / Math.pow(10, inputDecimals);
    const takingAmountNormalized = takingAmount.toNumber() / Math.pow(10, outputDecimals);

    if (inputMint === targetTokenMint) {
      // SELL order - user is selling the target token (input) for another token (output)
      const pricePerToken = takingAmountNormalized / makingAmountNormalized;
      const volumeUsd = makingAmountNormalized * currentPriceUsd;
      sellOrders.push({ price: pricePerToken, volumeUsd });
    } else if (outputMint === targetTokenMint) {
      // BUY order - user is buying the target token (output) with another token (input)
      const pricePerToken = makingAmountNormalized / takingAmountNormalized;
      const volumeUsd = takingAmountNormalized * currentPriceUsd;
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
  const bucketSize = PRICE_BUCKET_PERCENTAGE;
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
    bucket.feePotentialUsd = bucket.totalVolumeUsd * BAGS_CREATOR_FEE_RATE;
  }

  return Array.from(bucketMap.values()).sort((a, b) =>
    side === 'sell' ? a.priceLevel - b.priceLevel : b.priceLevel - a.priceLevel
  );
}
