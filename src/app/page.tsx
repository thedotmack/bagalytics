'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, Droplets, Zap, BarChart3, Clock, Wallet, User, Crown } from 'lucide-react';


interface OrderBucket {
  priceLevel: number;
  side: 'buy' | 'sell';
  orderCount: number;
  totalVolumeUsd: number;
  feePotentialUsd: number;
  cumulativeFeesIfSweep: number;
}

interface TokenCreator {
  isCreator: boolean;
  provider: string | null;
  providerUsername: string | null;
  username: string | null;
  wallet: string;
  pfp: string | null;
  royaltyBps: number;
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
}

export default function Home() {
  const [tokenCA, setTokenCA] = useState('2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TokenData | null>(null);
  const [feesHistory, setFeesHistory] = useState<Array<{ time: string; fees: number; volume: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [limitOrderData, setLimitOrderData] = useState<{
    sellBuckets: OrderBucket[];
    buyBuckets: OrderBucket[];
    loading: boolean;
    error: string | null;
  }>({
    sellBuckets: [],
    buyBuckets: [],
    loading: false,
    error: null
  });

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

  // Generate simulated hourly fee history based on current data
  const generateFeesHistory = (totalFees: number) => {
    const hours = [];
    const baseHourlyFee = totalFees / 24;

    for (let i = 0; i < 24; i++) {
      const hour = i === 0 ? '12AM' : i < 12 ? `${i}AM` : i === 12 ? '12PM' : `${i - 12}PM`;
      const variance = 0.5 + Math.random();
      const fees = baseHourlyFee * variance;
      hours.push({
        time: hour,
        fees: parseFloat(fees.toFixed(2)),
        volume: parseFloat((fees * 100).toFixed(2))
      });
    }
    return hours;
  };

  const analyze = async () => {
    if (!tokenCA.trim()) return;

    setLoading(true);
    setError(null);

    const tokenData = await fetchTokenData(tokenCA);

    if (tokenData) {
      setData(tokenData);
      setFeesHistory(generateFeesHistory(tokenData.fees24h));
    } else {
      setData(null);
      setFeesHistory([]);
      setError('Token not found or API unavailable');
    }

    setLoading(false);
  };

  useEffect(() => {
    analyze();
  }, []);

  useEffect(() => {
    if (!data || !tokenCA) return;

    const fetchOrders = async () => {
      setLimitOrderData(prev => ({ ...prev, loading: true }));

      try {
        // Fetch from our API route (SDK runs server-side)
        const response = await fetch(`/api/orders/${tokenCA}?price=${data.price}`);
        if (!response.ok) throw new Error('Failed to fetch orders');

        const { sellBuckets, buyBuckets } = await response.json();

        setLimitOrderData({
          sellBuckets: sellBuckets || [],
          buyBuckets: buyBuckets || [],
          loading: false,
          error: null
        });
      } catch (error) {
        setLimitOrderData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load'
        }));
      }
    };

    fetchOrders();

    // Refresh every 60 seconds
    const interval = setInterval(fetchOrders, 60000);
    return () => clearInterval(interval);
  }, [tokenCA, data?.price]);

  // Metric card component with proper contrast
  const MetricCard = ({ icon: Icon, label, value, subtitle, trend, highlight }: {
    icon: React.ElementType;
    label: string;
    value: string;
    subtitle?: string;
    trend?: number;
    highlight?: boolean;
  }) => (
    <Card className={`border-zinc-700 ${highlight ? 'bg-emerald-900/40 border-emerald-700' : 'bg-zinc-900'} transition-all hover:border-zinc-600`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
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
      </CardHeader>
      <CardContent>
        <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">{value}</div>
        {subtitle && <p className="text-sm text-zinc-300 mt-1">{subtitle}</p>}
      </CardContent>
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
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl sm:text-6xl">💰</div>
            <div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent">
                BAGALYTICS
              </h1>
              <p className="text-zinc-300 text-sm sm:text-base font-mono mt-1">
                1% Creator Fee Tracker · Volume Analytics
              </p>
            </div>
          </div>

          {/* Error alert */}
          {error && (
            <Alert className="border-red-600 bg-red-950 mt-4">
              <AlertDescription className="text-red-100 text-sm">
                <span className="font-semibold text-red-300">Error</span> — {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Search */}
        <Card className="border-zinc-700 bg-zinc-900 mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                value={tokenCA}
                onChange={(e) => setTokenCA(e.target.value)}
                placeholder="Enter token contract address..."
                className="flex-1 bg-zinc-950 border-zinc-600 text-white font-mono text-sm placeholder:text-zinc-500 focus:border-emerald-500 focus:ring-emerald-500/20 h-12"
              />
              <Button
                onClick={analyze}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold uppercase tracking-wider h-12 px-8 transition-all hover:shadow-lg hover:shadow-emerald-500/20"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 animate-spin" />
                    Loading...
                  </span>
                ) : 'Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            {/* Hero Metrics - 24h Fees and Lifetime Fees side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* 24h Fees Box */}
              <Card className="border-emerald-700 bg-zinc-900 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 to-transparent pointer-events-none" />
                <CardContent className="pt-6 pb-6 relative">
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

                  <div className="text-4xl sm:text-5xl font-black text-emerald-400 font-mono tracking-tighter mb-3">
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
              <Card className="border-amber-700/50 bg-zinc-900 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 to-transparent pointer-events-none" />
                <CardContent className="pt-6 pb-6 relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
                        Lifetime Fees
                      </span>
                    </div>
                    <span className="text-xs font-mono text-zinc-500">ALL TIME</span>
                  </div>

                  <div className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-tighter mb-3">
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

            {/* Token Creators Section */}
            <Card className="border-zinc-700 bg-zinc-900 mb-8">
              <CardHeader className="pb-3">
                <CardTitle className="text-white font-semibold text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-purple-400" />
                  Token Creators
                </CardTitle>
                <CardDescription className="text-zinc-400 text-sm">
                  Fee recipients and royalty distribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!data.creators || data.creators.length === 0 ? (
                  <div className="text-center py-6">
                    <User className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">No creator data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Sort creators: primary creator first */}
                    {[...data.creators]
                      .sort((a, b) => (b.isCreator ? 1 : 0) - (a.isCreator ? 1 : 0))
                      .map((creator) => {
                        const displayName = creator.providerUsername ?? creator.username ?? 'Unknown';
                        const truncatedWallet = `${creator.wallet.slice(0, 4)}...${creator.wallet.slice(-4)}`;
                        const royaltyPercent = (creator.royaltyBps / 100).toFixed(2);

                        return (
                          <div
                            key={creator.wallet}
                            className={`flex items-center gap-4 p-4 rounded-lg border ${
                              creator.isCreator
                                ? 'bg-purple-950/30 border-purple-700/50'
                                : 'bg-zinc-950 border-zinc-700'
                            }`}
                          >
                            {/* Profile Picture */}
                            <div className="relative flex-shrink-0">
                              {creator.pfp ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={creator.pfp}
                                  alt={displayName}
                                  className="w-12 h-12 rounded-full object-cover border-2 border-zinc-600"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                  }}
                                />
                              ) : null}
                              <div className={`w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center border-2 border-zinc-600 ${creator.pfp ? 'hidden' : ''}`}>
                                <span className="text-lg font-bold text-zinc-400">
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              {creator.isCreator && (
                                <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-1">
                                  <Crown className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>

                            {/* Creator Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-white truncate">
                                  {displayName}
                                </span>
                                {creator.isCreator && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 font-medium">
                                    Creator
                                  </span>
                                )}
                                {creator.provider && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    creator.provider === 'twitter'
                                      ? 'bg-sky-600/30 text-sky-300'
                                      : creator.provider === 'tiktok'
                                      ? 'bg-pink-600/30 text-pink-300'
                                      : creator.provider === 'github'
                                      ? 'bg-zinc-600/30 text-zinc-300'
                                      : 'bg-zinc-600/30 text-zinc-300'
                                  }`}>
                                    {creator.provider}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-zinc-400 font-mono mt-1">
                                {truncatedWallet}
                              </div>
                            </div>

                            {/* Royalty Percentage */}
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl font-bold text-emerald-400 font-mono">
                                {royaltyPercent}%
                              </div>
                              <div className="text-xs text-zinc-500">royalty</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fees Chart */}
            <Card className="border-zinc-700 bg-zinc-900 mb-8">
              <CardHeader>
                <div>
                  <CardTitle className="text-emerald-400 font-mono uppercase tracking-wider text-sm sm:text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Fee Stream (24h)
                  </CardTitle>
                  <CardDescription className="text-zinc-300 text-sm mt-1">
                    Hourly creator fees from 1% trading volume
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={feesHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
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
              </CardContent>
            </Card>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <MetricCard
                icon={BarChart3}
                label="Volume 24h"
                value={`$${(data.volume24h / 1000).toFixed(1)}K`}
                subtitle={`6h: $${(data.volume6h / 1000).toFixed(1)}K`}
                trend={data.priceChange24h}
              />
              <MetricCard
                icon={Droplets}
                label="Liquidity"
                value={`$${(data.liquidity / 1000).toFixed(1)}K`}
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

            {/* Insights Panel */}
            <Card className="border-zinc-700 bg-zinc-900">
              <CardHeader>
                <CardTitle className="text-white font-semibold text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-400" />
                  Volume Optimization Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Buy/Sell Pressure */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-zinc-200">Buy/Sell Ratio</span>
                    <span className={`text-sm font-mono font-semibold ${data.buys24h > data.sells24h ? 'text-emerald-400' : 'text-red-400'}`}>
                      {((data.buys24h / data.sells24h) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${(data.buys24h / (data.buys24h + data.sells24h)) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-zinc-300 mt-2">
                    {data.buys24h > data.sells24h
                      ? '📈 Strong buy pressure → Price momentum building'
                      : '📉 Sell pressure detected → Watch for reversal signals'
                    }
                  </p>
                </div>

                {/* Volatility Alert */}
                {Math.abs(data.priceChange24h) > 10 && (
                  <div className="p-4 bg-emerald-950 rounded-lg border border-emerald-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-300">High Volatility Detected</span>
                    </div>
                    <p className="text-sm text-zinc-200">
                      {Math.abs(data.priceChange24h).toFixed(1)}% price swing in 24h — increased trading activity typically means more fee generation opportunities.
                    </p>
                  </div>
                )}

                {/* Fee Projections */}
                <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-zinc-300" />
                    <span className="text-sm font-medium text-zinc-200">Fee Projections</span>
                  </div>

                  {/* Velocity comparison */}
                  {(() => {
                    const lifetimeVelocity = data.tokenAgeHours && data.tokenAgeHours > 0
                      ? data.lifetimeFeesUsd / data.tokenAgeHours
                      : 0;
                    return (
                      <>
                        <div className="flex flex-wrap gap-4 mb-4 text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Lifetime avg:</span>
                            <span className="text-amber-400">${lifetimeVelocity.toFixed(2)}/hr</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">24h avg:</span>
                            <span className={data.feeVelocity > lifetimeVelocity ? 'text-emerald-400' : 'text-zinc-300'}>
                              ${data.feeVelocity.toFixed(2)}/hr
                              {data.feeVelocity > lifetimeVelocity && ' ↑'}
                            </span>
                          </div>
                          {data.feeVelocity1h !== undefined && (
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">1h:</span>
                              <span className={data.feeVelocity1h > lifetimeVelocity ? 'text-emerald-400' : 'text-zinc-300'}>
                                ${data.feeVelocity1h.toFixed(2)}/hr
                                {data.feeVelocity1h > lifetimeVelocity && ' ↑'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Weekly</p>
                            <p className="text-xl font-bold text-amber-400 font-mono">
                              ${(lifetimeVelocity * 24 * 7).toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Monthly</p>
                            <p className="text-xl font-bold text-amber-400 font-mono">
                              ${(lifetimeVelocity * 24 * 30).toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Yearly</p>
                            <p className="text-xl font-bold text-amber-400 font-mono">
                              ${(lifetimeVelocity * 24 * 365).toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </p>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-400 mt-3">
                          * Projections based on lifetime avg ${lifetimeVelocity.toFixed(2)}/hr ({data.tokenAgeHours?.toFixed(0) ?? 0} hours)
                        </p>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Limit Order Fee Potential */}
            {data && (
              <Card className="border-zinc-700 bg-zinc-900 mt-8">
                <CardHeader>
                  <CardTitle className="text-emerald-400 font-mono uppercase tracking-wider text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Limit Order Fee Potential
                  </CardTitle>
                  <CardDescription className="text-zinc-300 text-sm">
                    Fees earned when price hits these levels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {limitOrderData.loading && (
                    <div className="flex items-center justify-center py-8">
                      <Activity className="h-4 w-4 animate-spin text-emerald-400" />
                      <span className="ml-2 text-zinc-400 text-sm">Loading limit orders...</span>
                    </div>
                  )}
                  {!limitOrderData.loading && limitOrderData.error && (
                    <Alert className="border-red-600 bg-red-950">
                      <AlertDescription className="text-red-100 text-sm">
                        <span className="font-semibold text-red-300">Error</span> — {limitOrderData.error}
                      </AlertDescription>
                    </Alert>
                  )}
                  {!limitOrderData.loading && !limitOrderData.error &&
                   limitOrderData.sellBuckets.length === 0 && limitOrderData.buyBuckets.length === 0 && (
                    <div className="text-center py-6">
                      <Target className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
                      <p className="text-zinc-500 text-sm">No open limit orders found</p>
                    </div>
                  )}
                  {!limitOrderData.loading && !limitOrderData.error &&
                   (limitOrderData.sellBuckets.length > 0 || limitOrderData.buyBuckets.length > 0) && (
                    <div className="space-y-6">
                      {/* Summary */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-emerald-950/30 rounded-lg border border-emerald-800">
                        <div className="text-xs text-emerald-400 uppercase mb-1">If Pumps</div>
                        <div className="text-2xl font-bold text-emerald-400 font-mono">
                          ${limitOrderData.sellBuckets.reduce((s, b) => s + b.feePotentialUsd, 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {limitOrderData.sellBuckets.reduce((s, b) => s + b.orderCount, 0)} sell orders
                        </div>
                      </div>
                      <div className="p-4 bg-red-950/30 rounded-lg border border-red-800">
                        <div className="text-xs text-red-400 uppercase mb-1">If Dumps</div>
                        <div className="text-2xl font-bold text-red-400 font-mono">
                          ${limitOrderData.buyBuckets.reduce((s, b) => s + b.feePotentialUsd, 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {limitOrderData.buyBuckets.reduce((s, b) => s + b.orderCount, 0)} buy orders
                        </div>
                      </div>
                    </div>

                    {/* Price levels */}
                    <div className="space-y-2">
                      {limitOrderData.sellBuckets.slice(0, 5).map((bucket, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded bg-emerald-950/20 border border-emerald-900">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono px-2 py-1 rounded bg-emerald-900 text-emerald-300">
                              +{((bucket.priceLevel - data.price) / data.price * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-zinc-300 font-mono">
                              ${bucket.priceLevel.toFixed(7)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-emerald-400">
                              ${bucket.feePotentialUsd.toFixed(2)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {bucket.orderCount} orders
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Current price */}
                      <div className="flex items-center gap-3 py-2 px-3 bg-zinc-800 rounded border border-zinc-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-zinc-300 font-mono text-sm">
                          Current: ${data.price.toFixed(7)}
                        </span>
                      </div>

                      {limitOrderData.buyBuckets.slice(0, 5).map((bucket, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded bg-red-950/20 border border-red-900">
                          <div className="flex items-center gap-3">
                            <div className="text-xs font-mono px-2 py-1 rounded bg-red-900 text-red-300">
                              {((bucket.priceLevel - data.price) / data.price * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-zinc-300 font-mono">
                              ${bucket.priceLevel.toFixed(7)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-red-400">
                              ${bucket.feePotentialUsd.toFixed(2)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {bucket.orderCount} orders
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-zinc-400 text-xs font-mono">
            BAGALYTICS · Built for Bags.fm Creators · 1% Volume = Your Income
          </p>
        </div>
      </div>
    </div>
  );
}
