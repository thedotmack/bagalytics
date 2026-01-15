"use client";

import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Activity, DollarSign, Clock, Wallet, Copy, ExternalLink, RefreshCw, Star } from "lucide-react";
import Image from "next/image";
import { TokenTicker } from "@/components/TokenTicker";

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

const truncateAddress = (addr: string): string => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

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
  priceChange5m: number;
  priceChange1h: number;
  priceChange6h: number;
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
  const [tokenCA, setTokenCA] = useState("2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [githubStars, setGithubStars] = useState<number | null>(null);

  // Fetch token data from our API route
  const fetchTokenData = async (ca: string): Promise<TokenData | null> => {
    try {
      const response = await fetch(`/api/token/${ca}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.error("API fetch failed:", err);
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
      setError("Token not found or API unavailable");
    }

    setLoading(false);
  };

  useEffect(() => {
    analyze();
  }, []);

  // Fetch GitHub star count via server-side API (cached in Redis)
  useEffect(() => {
    fetch("/api/github-stars")
      .then((res) => res.json())
      .then((data) => {
        if (data.stars !== null && data.stars !== undefined) {
          setGithubStars(data.stars);
        }
      })
      .catch(() => {});
  }, []);

  // Handle token selection from ticker
  const handleTickerTokenSelect = (address: string) => {
    setTokenCA(address);
    setLoading(true);
    setError(null);
    fetchTokenData(address).then((tokenData) => {
      if (tokenData) {
        setData(tokenData);
        setLastUpdated(new Date());
      } else {
        setData(null);
        setError("Token not found or API unavailable");
      }
      setLoading(false);
    });
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload?: { volume: number } }>; label?: string }) => {
    if (active && payload && payload.length) {
      const feeAmount = payload[0].value; // Already 1% from API
      const volume = payload[0].payload?.volume || feeAmount * 100;
      return (
        <div className="bg-zinc-900 border border-zinc-600 rounded-lg p-3 shadow-xl">
          <p className="text-white text-sm font-medium mb-1">{label}</p>
          <p className="text-emerald-400 font-mono font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>${feeAmount.toFixed(2)}</p>
          <p className="text-zinc-300 text-xs mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>Vol: ${volume.toLocaleString()}</p>
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
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Trending tokens ticker - pressed to top */}
      <div className="relative z-10">
        <TokenTicker onTokenSelect={handleTickerTokenSelect} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto pt-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          {/* Left: Logo + tagline */}
          <div className="flex items-center gap-3">
            <Image src="/bagalytics-icon.png" alt="Bagalytics" width={40} height={40} />
            <div>
              <h1 className="text-2xl text-neon" style={{ fontFamily: "var(--font-diplomata)" }}>
                bagalytics
              </h1>
            </div>
          </div>

          {/* Right: Social links + Search input + button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Social Links */}
            <div className="flex items-center gap-2">
              {/* X (Twitter) */}
              <a
                href="https://x.com/Claude_Memory"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Follow on X"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              {/* Discord */}
              <a
                href="https://discord.gg/J4wttp9vDu"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center justify-center w-10 h-10 text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Join Discord"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
              {/* GitHub with stars */}
              <a
                href="https://github.com/thedotmack/claude-mem"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-10 px-3 text-zinc-500 hover:text-emerald-400 transition-colors"
                title="Star on GitHub"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">{githubStars !== null ? (githubStars >= 1000 ? `${(githubStars / 1000).toFixed(1)}k` : githubStars) : "—"}</span>
              </a>
            </div>
            {/* Search input + button */}
            <div className="flex gap-2 w-full sm:w-auto">
              <Input value={tokenCA} onChange={(e) => setTokenCA(e.target.value)} placeholder="Enter token contract address..." className="w-full sm:w-64 md:w-80 h-9 px-3 text-sm bg-zinc-900 border-zinc-700 rounded-lg font-mono placeholder:text-zinc-500 focus:border-neon-500 focus:ring-neon-500/20" />
              <Button onClick={analyze} disabled={loading} className="h-9 px-4 text-sm rounded-lg bg-neon-600 hover:bg-neon-500 font-semibold text-black">
                bagalyze
              </Button>
            </div>
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
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Token Details */}
        {data && (
          <Card className="mb-2 p-5 rounded-xl bg-black/60">
            {/* Top row: Token identity + Purchase links */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {/* Token Image */}
                {data.tokenImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={data.tokenImage} alt={data.tokenName || "Token"} className="w-14 h-14 rounded-full" />
                ) : data.creators[0]?.pfp ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={data.creators[0].pfp} alt={data.tokenName || "Token"} className="w-14 h-14 rounded-full" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-zinc-600" />
                  </div>
                )}

                {/* Token Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-white">{data.tokenName || data.tokenSymbol || "Token"}</h2>
                    <button onClick={analyze} disabled={loading} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors disabled:opacity-50" title="Refresh data">
                      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1 text-zinc-500 text-sm font-mono hover:text-zinc-300 transition-colors" onClick={() => navigator.clipboard.writeText(tokenCA)}>
                      {truncateAddress(tokenCA)}
                      <Copy className="w-3 h-3" />
                    </button>
                    {lastUpdated && <span className="text-xs text-zinc-600">Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                  </div>
                </div>
              </div>

              {/* Purchase Links */}
              <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3">
                <a href={`https://bags.fm/${tokenCA}?ref=claudememory`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-neon-600/20 text-neon text-xs md:text-sm font-medium hover:bg-neon-500/30 transition-colors">
                  Bags.fm
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a href={`https://jup.ag/tokens/${tokenCA}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs md:text-sm font-medium hover:bg-zinc-700 transition-colors">
                  Jupiter
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a href={`https://photon-sol.tinyastro.io/en/lp/${tokenCA}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs md:text-sm font-medium hover:bg-zinc-700 transition-colors">
                  Photon
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a href={`https://dexscreener.com/solana/${tokenCA}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs md:text-sm font-medium hover:bg-zinc-700 transition-colors">
                  DEXScreener
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Fee Stats Header - Above Chart */}
      {data && (
        <div className="relative z-20 max-w-6xl mx-auto px-8 sm:px-10 lg:px-12 -mb-8 sm:-mb-12 md:-mb-16">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
            {/* Left: Lifetime Fees */}
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Lifetime Fees</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-normal text-amber-400 font-mono tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>{data.lifetimeFeesUsd > 0 ? `$${data.lifetimeFeesUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}</p>
              <p className="text-sm font-mono text-zinc-500 mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>{data.lifetimeFeesSol > 0 ? `${data.lifetimeFeesSol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SOL` : ""}</p>
            </div>

            {/* Right: 24h Fees */}
            <div className="text-center sm:text-right">
              <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">24h Fees</p>
              <p className="text-3xl sm:text-4xl md:text-5xl font-normal text-emerald-400 font-mono tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>${data.totalFeesAccumulated.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
              <p className="text-sm font-mono text-zinc-500 mt-1" style={{ fontVariantNumeric: "tabular-nums" }}>
                <span className="text-emerald-400">${data.feeVelocity.toFixed(2)}/hr</span>
                <span className="mx-2">·</span>
                <span>6h: ${data.fees6h.toFixed(0)}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Full-width Fee Stream Chart - Outside container */}
      {data && data.hourlyFees && data.hourlyFees.length > 0 && (
        <div className="relative z-10 w-full h-64 sm:h-80 outline-none focus:outline-none select-none" tabIndex={-1}>
          {/* Edge fade overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.hourlyFees} margin={{ top: 50, right: 0, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis hide dataKey="time" />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="fees"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#feeGradient)"
                animationDuration={800}
                dot={(props: { cx?: number; cy?: number; index?: number; payload?: { time: string; fees: number } }) => {
                  const { cx, cy, index, payload } = props;
                  // Show dot every 3 hours (indices 0, 3, 6, 9, etc.)
                  if (index === undefined || index % 3 !== 0 || !cx || !cy || !payload) return <g key={index} />;
                  const labelWidth = 70;
                  const labelHeight = 44;
                  return (
                    <g key={index}>
                      {/* Label box above dot */}
                      <rect x={cx - labelWidth / 2} y={cy - labelHeight - 12} width={labelWidth} height={labelHeight} rx={6} fill="rgba(0, 0, 0, 0.85)" stroke="rgba(39, 39, 42, 0.5)" strokeWidth={1} />
                      {/* Fee amount - big and bold */}
                      <text x={cx} y={cy - labelHeight + 8} textAnchor="middle" fill="#10b981" fontSize={16} fontWeight="bold">
                        ${payload.fees >= 1000 ? `${(payload.fees / 1000).toFixed(1)}K` : payload.fees.toFixed(0)}
                      </text>
                      {/* Time label */}
                      <text x={cx} y={cy - 18} textAnchor="middle" fill="#a1a1aa" fontSize={12} fontWeight="500">
                        {payload.time}
                      </text>
                      {/* Dot */}
                      <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#fff" strokeWidth={2} />
                    </g>
                  );
                }}
                activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics row below chart */}
      {data && (
        <div className="relative z-10 max-w-6xl mx-auto px-8 sm:px-10 lg:px-13 mt-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between py-3 border-t border-zinc-700/50">
            {/* Left: Static metrics */}
            <div className="grid grid-cols-2 gap-4 sm:flex sm:items-end sm:gap-8">
              <div>
                <p className="text-zinc-500 text-xs uppercase mb-1">Market Cap</p>
                <p className="text-lg font-semibold text-amber-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCompactUsd(data.marketCap)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase mb-1">Price</p>
                <p className="text-lg font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                  ${data.price < 0.001 ? data.price.toFixed(7) : data.price.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase mb-1">Liquidity</p>
                <p className="text-lg font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCompactUsd(data.liquidity)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500 text-xs uppercase mb-1">Volume 24H</p>
                <p className="text-lg font-semibold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCompactUsd(data.volume24h)}
                </p>
              </div>
            </div>

            {/* Right: Price Changes */}
            <div>
              <p className="text-zinc-500 text-xs uppercase mb-2">% Change</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                <div className={`px-2.5 py-1 rounded ${data.priceChange5m >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <span className="text-zinc-400 text-xs mr-1.5">5m</span>
                  <span className={`font-mono font-semibold ${data.priceChange5m >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {data.priceChange5m >= 0 ? "+" : ""}
                    {data.priceChange5m.toFixed(1)}%
                  </span>
                </div>
                <div className={`px-2.5 py-1 rounded ${data.priceChange1h >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <span className="text-zinc-400 text-xs mr-1.5">1h</span>
                  <span className={`font-mono font-semibold ${data.priceChange1h >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {data.priceChange1h >= 0 ? "+" : ""}
                    {data.priceChange1h.toFixed(1)}%
                  </span>
                </div>
                <div className={`px-2.5 py-1 rounded ${data.priceChange6h >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <span className="text-zinc-400 text-xs mr-1.5">6h</span>
                  <span className={`font-mono font-semibold ${data.priceChange6h >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {data.priceChange6h >= 0 ? "+" : ""}
                    {data.priceChange6h.toFixed(1)}%
                  </span>
                </div>
                <div className={`px-2.5 py-1 rounded ${data.priceChange24h >= 0 ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
                  <span className="text-zinc-400 text-xs mr-1.5">24h</span>
                  <span className={`font-mono font-semibold ${data.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {data.priceChange24h >= 0 ? "+" : ""}
                    {data.priceChange24h.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content below chart */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {data && (
          <>
            {/* Fee Projections */}
            <Card className="mb-6 p-5 rounded-xl bg-black/60">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-zinc-500" />
                <h3 className="text-lg font-semibold text-zinc-400">Fee Projections</h3>
              </div>

              {/* Projections grid - 5 columns */}
              {(() => {
                const lifetimeVelocity = data.tokenAgeHours && data.tokenAgeHours > 0 ? data.lifetimeFeesUsd / data.tokenAgeHours : 0;
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-6">
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Lifetime Avg</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-400" style={{ fontVariantNumeric: "tabular-nums" }}>
                          ${lifetimeVelocity.toFixed(2)}
                          <span className="text-lg">/hr</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">24h Avg</p>
                        <p className={`text-xl sm:text-2xl font-bold ${data.feeVelocity > lifetimeVelocity ? "text-emerald-400" : "text-zinc-300"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                          ${data.feeVelocity.toFixed(2)}
                          <span className="text-lg">/hr</span>
                          {data.feeVelocity > lifetimeVelocity && <span className="text-sm ml-1">↑</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Weekly</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>${(lifetimeVelocity * 24 * 7).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Monthly</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>${(lifetimeVelocity * 24 * 30).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Yearly</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-400" style={{ fontVariantNumeric: "tabular-nums" }}>${(lifetimeVelocity * 24 * 365).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    {/* Trading Activity Stats - distributed underneath */}
                    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5 md:gap-6 text-sm">
                      <div>
                        <span className="text-zinc-500 block text-xs mb-1">Price Swing</span>
                        <span className={`font-mono font-medium ${data.priceChange24h >= 0 ? "text-emerald-400" : "text-red-400"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
                          {data.priceChange24h >= 0 ? "+" : ""}
                          {data.priceChange24h.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs mb-1">24h Trades</span>
                        <span className="text-white font-mono font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>{data.txns24h.toLocaleString()}</span>
                        <span className="text-zinc-500 text-xs ml-1" style={{ fontVariantNumeric: "tabular-nums" }}>({(data.txns24h / 1440).toFixed(1)}/min)</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs mb-1">Buy / Sell</span>
                        <span className="text-emerald-400 font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>↑{data.buys24h.toLocaleString()}</span>
                        <span className="text-zinc-600 mx-1">/</span>
                        <span className="text-red-400 font-mono" style={{ fontVariantNumeric: "tabular-nums" }}>↓{data.sells24h.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs mb-1">Fee Rate</span>
                        <span className="text-white font-mono font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>${(data.feeVelocity / 60).toFixed(2)}</span>
                        <span className="text-zinc-500 text-xs">/min</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-xs mb-1">Per Second</span>
                        <span className="text-white font-mono font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>${(data.feeVelocity / 3600).toFixed(4)}</span>
                        <span className="text-zinc-500 text-xs">/sec</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </Card>
          </>
        )}

        {/* Token Creators */}
        {data && data.creators && data.creators.length > 0 && (
          <div className="mb-8">
            <h3 className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-4 text-center">Token Creators</h3>
            <div className="flex gap-4 flex-wrap justify-center">
              {[...data.creators]
                .sort((a, b) => (b.isCreator ? 1 : 0) - (a.isCreator ? 1 : 0))
                .map((creator) => {
                  const displayName = creator.providerUsername ?? creator.username ?? "Unknown";
                  const truncatedWallet = `${creator.wallet.slice(0, 4)}...${creator.wallet.slice(-4)}`;

                  return (
                    <div key={creator.wallet} className="flex items-center gap-4 px-4 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl min-w-[280px]">
                      {creator.pfp ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={creator.pfp} alt={displayName} className="w-11 h-11 rounded-full ring-2 ring-zinc-700" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-zinc-800 ring-2 ring-zinc-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-zinc-400">{displayName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-white truncate">{displayName}</span>
                          {creator.isCreator && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded shrink-0">Creator</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-500 text-xs font-mono">{truncatedWallet}</span>
                          {creator.provider && <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] rounded">{creator.provider}</span>}
                        </div>
                      </div>
                      <div className="text-right pl-2">
                        <span className="text-emerald-400 font-bold text-lg" style={{ fontVariantNumeric: "tabular-nums" }}>{(creator.royaltyBps / 100).toFixed(1)}%</span>
                        <p className="text-zinc-600 text-[10px] uppercase">Royalty</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-zinc-500 text-sm py-10">
          <a href="https://bags.fm/2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS?ref=claudememory" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-emerald-400 transition-colors">
            bagalytics
          </a>
          {" · "}
          <a href="https://bags.fm/2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS?ref=claudememory" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
            Built for Bags.fm Creators
          </a>
          {" · "}
          <a href="https://bags.fm/2TsmuYUrsctE57VLckZBYEEzdokUF8j8e1GavekWBAGS?ref=claudememory" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors">
            Built with $CMEM
          </a>
        </footer>
      </div>
    </div>
  );
}
