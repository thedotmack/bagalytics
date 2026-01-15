# Bagalytics

Real-time creator fee analytics for [Bags.fm](https://bags.fm) tokens on Solana.

Tracks the 1% creator fee on token trading volume, showing lifetime fees, hourly breakdowns, and fee velocity metrics.

## Features

- **Lifetime Fee Tracking** - Total creator fees accumulated in SOL and USD
- **Hourly Fee Chart** - Visual breakdown of fees over the last 24 hours
- **Fee Velocity** - Track fee generation rate per hour/minute/second
- **Fee Projections** - Weekly, monthly, and yearly projections based on current activity
- **Trading Activity** - Volume, transactions, buy/sell ratio, price changes
- **Token Creators** - View creator wallets and royalty splits

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and enter a Bags.fm token address.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | Yes | Solana RPC endpoint (Helius, QuickNode, etc.) |
| `BAGS_API_KEY` | Yes | Bags.fm API key for lifetime fees |
| `BIRDEYE_API_KEY` | Yes | Birdeye API key for hourly volume data |
| `REDIS_URL` | No | Redis URL for caching (defaults to `redis://localhost:6379`) |

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t bagalytics .
docker run -p 3000:3000 --env-file .env.local bagalytics
```

For Coolify: Connect your repo and set environment variables. Coolify auto-detects the Dockerfile.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **Bags SDK** - Fetches lifetime creator fees from on-chain state
- **DexScreener API** - Real-time price, volume, and liquidity data
- **Birdeye API** - Hourly OHLCV data for fee charts
- **Redis** - Caching layer for API responses
- **Recharts** - Chart visualizations

## API Endpoints

- `GET /api/token/[address]` - Full token analytics
- `GET /api/trending` - Trending Bags.fm tokens

## License

MIT
