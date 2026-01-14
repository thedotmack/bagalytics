'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Droplets, Zap, BarChart3, Clock, Wallet, User, Copy } from 'lucide-react';

// Format large numbers with K/M suffixes
const formatCompactUsd = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const truncateAddress = (addr: string): string =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;

interface TokenCreator {
  isCreator: boolean;
  provider: string | null;
  providerUsername: string | null;
  username: string | null;
  wallet: string;
  pfp: string | null;
  royaltyBps: number;
}

interface HourlyFee {
  time: string;
  fees: number;
  volume: number;
}

interface TokenData {
  price: number;
  volume24h: number;
  volume6h: number;
  volume1h: number;
  liquidity: number;
  priceChange24h: number;
  txns24h: number;
  buys24h: number;
  sells24h: number;
  marketCap: number;
  fees24h: number;
  fees6h: number;
  fees1h: number;
  feeVelocity: number;
  feeVelocity24h: number;
  feeVelocity6h: number;
  feeVelocity1h: number;
  totalFeesAccumulated: number;
  pairCreatedAt: number | null;
  tokenAgeHours: number | null;
  lifetimeFeesSol: number;
  lifetimeFeesUsd: number;
  solPriceUsd: number;
  creators: TokenCreator[];
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenImage: string | null;
  hourlyFees: HourlyFee[];
}

export default function Home() {
  const [tokenCA, setTokenCA] = useState('2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch token data from our API route
  const fetchTokenData = async (ca: string): Promise<TokenData | null> => {
    try {
      const response = await fetch(`/api/token/${ca}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error('API fetch failed:', err);
      return null;
    }
  };

  const analyze = async () => {
    if (!tokenCA.trim()) return;

    setLoading(true);
    setError(null);

    const tokenData = await fetchTokenData(tokenCA);

    if (tokenData) {
      setData(tokenData);
      setLastUpdated(new Date());
    } else {
      setData(null);
      setError('Token not found or API unavailable');
    }

    setLoading(false);
  };

  useEffect(() => {
    analyze();
  }, []);

  // Metric card component with proper contrast
  const MetricCard = ({ icon: Icon, label, value, subtitle, trend, highlight }: {
    icon: React.ElementType;
    label: string;
    value: string;
    subtitle?: string;
    trend?: number;
    highlight?: boolean;
  }) => (
    <Card className={`rounded-xl border p-5 ${highlight ? 'bg-emerald-900/40 border-emerald-600' : 'bg-zinc-900 border-zinc-700'} transition-all hover:border-zinc-500`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${highlight ? 'text-emerald-400' : 'text-zinc-300'}`} />
          <span className="text-xs font-medium text-zinc-200 uppercase tracking-wider">{label}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">{value}</div>
      {subtitle && <p className="text-sm text-zinc-300 mt-1">{subtitle}</p>}
    </Card>
  );

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-600 rounded-lg p-3 shadow-xl">
          <p className="text-white text-sm font-medium mb-1">{label}</p>
          <p className="text-emerald-400 font-mono font-bold">
            ${payload[0].value.toFixed(2)}
          </p>
          <p className="text-zinc-300 text-xs mt-1">
            Vol: ${(payload[0].value * 100).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          {/* Left: Logo + tagline */}
          <div className="flex items-center gap-3">
            <span className="text-4xl">💰</span>
            <div>
              <h1 className="text-xl font-bold text-emerald-400 tracking-tight">BAGALYTICS</h1>
              <p className="text-xs text-zinc-500">Creator Fee Tracker · Volume Analytics</p>
            </div>
          </div>

          {/* Right: Search input + button */}
          <div className="flex gap-2">
            <Input
              value={tokenCA}
              onChange={(e) => setTokenCA(e.target.value)}
              placeholder="Enter token contract address..."
              className="w-80 h-9 px-3 text-sm bg-zinc-900 border-zinc-700 rounded-lg font-mono placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20"
            />
            <Button
              onClick={analyze}
              disabled={loading}
              className="h-9 px-4 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 animate-spin" />
                  Loading...
                </span>
              ) : 'Analyze'}
            </Button>
          </div>
        </header>

        {/* Error alert */}
        {error && (
          <Alert className="border-red-600 bg-red-950 mb-8">
            <AlertDescription className="text-red-100 text-sm">
              <span className="font-semibold text-red-300">Error</span> — {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Token Details Card */}
        {data && (
          <Card className="mb-6 p-5 rounded-xl bg-zinc-900 border border-zinc-700">
            <div className="flex items-center gap-4">
              {/* Token Image */}
              {data.tokenImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={data.tokenImage}
                  alt={data.tokenName || 'Token'}
                  className="w-16 h-16 rounded-full"
                />
              ) : data.creators[0]?.pfp ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={data.creators[0].pfp}
                  alt={data.tokenName || 'Token'}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-zinc-600" />
                </div>
              )}

              {/* Token Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {data.tokenName || data.tokenSymbol || 'Token'}
                </h2>
                <button
                  className="flex items-center gap-1 text-zinc-500 text-sm font-mono hover:text-zinc-300 transition-colors"
                  onClick={() => navigator.clipboard.writeText(tokenCA)}
                >
                  {truncateAddress(tokenCA)}
                  <Copy className="w-3 h-3" />
                </button>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-6 text-right">
                <div>
                  <p className="text-zinc-500 text-xs uppercase">Price</p>
                  <p className="text-xl font-bold text-white">
                    ${data.price < 0.001 ? data.price.toFixed(7) : data.price.toFixed(4)}
                  </p>
                  <p className={`text-sm ${data.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {data.priceChange24h >= 0 ? '+' : ''}{data.priceChange24h.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs uppercase">Volume 24H</p>
                  <p className="text-xl font-bold text-white">{formatCompactUsd(data.volume24h)}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {data && (
          <>
            {/* Fee Projections - PRIMARY FOCUS */}
            <Card className="mb-6 p-5 rounded-xl bg-zinc-900 border border-zinc-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Fee Projections</h3>
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <span className="text-xs text-zinc-500">
                      Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  <button
                    onClick={analyze}
                    disabled={loading}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                  >
                    <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Rate indicators */}
              {(() => {
                const lifetimeVelocity = data.tokenAgeHours && data.tokenAgeHours > 0
                  ? data.lifetimeFeesUsd / data.tokenAgeHours
                  : 0;
                return (
                  <>
                    <div className="flex gap-6 text-sm text-zinc-400 mb-4">
                      <span>Lifetime avg: <span className="text-amber-400">${lifetimeVelocity.toFixed(2)}/hr</span></span>
                      <span>24h avg: <span className={data.feeVelocity > lifetimeVelocity ? 'text-emerald-400' : 'text-zinc-300'}>${data.feeVelocity.toFixed(2)}/hr{data.feeVelocity > lifetimeVelocity && ' ↑'}</span></span>
                      {data.feeVelocity1h !== undefined && (
                        <span>1h: <span className={data.feeVelocity1h > lifetimeVelocity ? 'text-emerald-400' : 'text-zinc-300'}>${data.feeVelocity1h.toFixed(2)}/hr{data.feeVelocity1h > lifetimeVelocity && ' ↑'}</span></span>
                      )}
                    </div>

                    {/* Projections grid - LARGE typography */}
                    <div className="grid grid-cols-3 gap-8">
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">WEEKLY</p>
                        <p className="text-3xl font-bold text-emerald-400">${(lifetimeVelocity * 24 * 7).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">MONTHLY</p>
                        <p className="text-3xl font-bold text-emerald-400">${(lifetimeVelocity * 24 * 30).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-sm mb-1">YEARLY</p>
                        <p className="text-3xl font-bold text-emerald-400">${(lifetimeVelocity * 24 * 365).toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                      </div>
                    </div>

                    {/* Trading Activity Row */}
                    <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-x-10 gap-y-2 text-sm">
                      <span className="text-zinc-500 font-medium">24h Stats:</span>
                      <span className="text-zinc-400">
                        <span className={data.priceChange24h >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {data.priceChange24h >= 0 ? '+' : ''}{data.priceChange24h.toFixed(1)}%
                        </span>
                        {' '}swing
                      </span>
                      <span className="text-zinc-400">
                        <span className="text-white font-medium">{data.txns24h.toLocaleString()}</span> trades
                      </span>
                      <span className="text-zinc-400">
                        <span className="text-emerald-400">↑{data.buys24h.toLocaleString()}</span>
                        {' / '}
                        <span className="text-red-400">↓{data.sells24h.toLocaleString()}</span>
                      </span>
                      <span className="text-zinc-400">
                        <span className="text-white font-mono">${(data.feeVelocity / 60).toFixed(2)}</span>/min
                      </span>
                      <span className="text-zinc-400">
                        <span className="text-white font-mono">${(data.feeVelocity / 3600).toFixed(4)}</span>/sec
                      </span>
                    </div>
                  </>
                );
              })()}
            </Card>

            {/* Hero Metrics - 24h Fees and Lifetime Fees side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* 24h Fees Box */}
              <Card className="p-5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-colors">
                <CardContent className="p-0 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">
                        Fees (24h)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-400">
                      <Activity className="h-3 w-3 animate-pulse" />
                      LIVE
                    </div>
                  </div>

                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tighter mb-3">
                    ${data.totalFeesAccumulated.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono">
                    <span className="text-zinc-300">
                      <span className="text-zinc-500">6h:</span> ${data.fees6h.toFixed(2)}
                    </span>
                    <span className="text-zinc-300">
                      <span className="text-zinc-500">1h:</span> ${data.fees1h.toFixed(2)}
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      ${data.feeVelocity.toFixed(2)}/hr
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Lifetime Fees Box */}
              <Card className="p-5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 transition-colors">
                <CardContent className="p-0 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                        Lifetime Fees
                      </span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">ALL TIME</span>
                  </div>

                  <div className="text-3xl font-black text-amber-400 font-mono tracking-tighter mb-3">
                    {data.lifetimeFeesUsd > 0
                      ? `$${data.lifetimeFeesUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                      : '—'
                    }
                  </div>

                  <div className="text-xs font-mono text-zinc-400">
                    {data.lifetimeFeesSol > 0
                      ? `${data.lifetimeFeesSol.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} SOL · All time creator fees`
                      : 'Not available for this token'
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Fees Chart */}
            <Card className="rounded-xl border border-zinc-700 bg-zinc-900 mb-8 p-5">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400 font-mono uppercase tracking-wider text-sm">Fee Stream (24h)</span>
              </div>
              <p className="text-zinc-300 text-sm mb-4">Hourly creator fees from 1% trading volume</p>
              {data.hourlyFees && data.hourlyFees.length > 0 ? (
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.hourlyFees} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      {/* Average reference line */}
                      <ReferenceLine
                        y={data.hourlyFees.reduce((sum, d) => sum + d.fees, 0) / data.hourlyFees.length}
                        stroke="#52525b"
                        strokeDasharray="5 5"
                      />
                      <XAxis
                        dataKey="time"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#d4d4d8' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#d4d4d8' }}
                        tickFormatter={(v) => `$${v}`}
                        width={50}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="fees"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#feeGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 sm:h-80 w-full flex items-center justify-center text-zinc-500">
                  No hourly data available from Birdeye
                </div>
              )}
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={BarChart3}
                label="Volume 24h"
                value={formatCompactUsd(data.volume24h)}
                subtitle={`6h: ${formatCompactUsd(data.volume6h)} · 1h: ${formatCompactUsd(data.volume1h)}`}
              />
              <MetricCard
                icon={Droplets}
                label="Liquidity"
                value={formatCompactUsd(data.liquidity)}
                subtitle="Pool depth"
              />
              <MetricCard
                icon={Zap}
                label="Transactions"
                value={data.txns24h.toLocaleString()}
                subtitle={`${data.buys24h} buys · ${data.sells24h} sells`}
              />
              <MetricCard
                icon={Target}
                label="Price"
                value={`$${data.price < 0.001 ? data.price.toFixed(7) : data.price.toFixed(4)}`}
                trend={data.priceChange24h}
              />
            </div>
          </>
        )}

        {/* Token Creators - Bottom of page */}
        {data && (
          <Card className="mb-6 p-5 rounded-xl bg-zinc-900 border border-zinc-700">
            <h3 className="text-zinc-400 text-sm font-medium mb-4">Token Creators</h3>

            {!data.creators || data.creators.length === 0 ? (
              <div className="text-center py-4">
                <User className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-sm">No creator data available</p>
              </div>
            ) : (
              <div className="flex gap-4 flex-wrap">
                {[...data.creators]
                  .sort((a, b) => (b.isCreator ? 1 : 0) - (a.isCreator ? 1 : 0))
                  .map((creator) => {
                    const displayName = creator.providerUsername ?? creator.username ?? 'Unknown';
                    const truncatedWallet = `${creator.wallet.slice(0, 4)}...${creator.wallet.slice(-4)}`;

                    return (
                      <div key={creator.wallet} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl">
                        {creator.pfp ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={creator.pfp}
                            alt={displayName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                            <span className="text-sm font-bold text-zinc-400">
                              {displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">
                              {displayName}
                            </span>
                            {creator.isCreator && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                                Creator
                              </span>
                            )}
                            {creator.provider && (
                              <span className="px-1.5 py-0.5 bg-zinc-700 text-zinc-400 text-xs rounded">
                                {creator.provider}
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-500 text-xs font-mono">
                            {truncatedWallet}
                          </span>
                        </div>
                        <div className="ml-auto text-right">
                          <span className="text-emerald-400 font-bold">
                            {(creator.royaltyBps / 100).toFixed(2)}%
                          </span>
                          <span className="text-zinc-500 text-xs block">royalty</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>
        )}

        {/* Footer */}
        <footer className="text-center text-zinc-600 text-xs py-8">
          BAGALYTICS · Built for Bags.fm Creators ·{' '}
          <a
            href="https://bags.fm/2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-500 hover:text-emerald-400 ml-1"
          >
            Built with $CMEM
          </a>
        </footer>
      </div>
    </div>
  );
}
