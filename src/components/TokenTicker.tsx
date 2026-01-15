'use client';

import { useEffect, useState } from 'react';
import { Marquee } from '@/components/ui/marquee';

interface TrendingToken {
  address: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  priceChange24h: number;
}

interface TokenTickerProps {
  onTokenSelect: (address: string) => void;
}

const TokenItem = ({
  token,
  onClick,
}: {
  token: TrendingToken;
  onClick: () => void;
}) => {
  const isPositive = token.priceChange24h >= 0;
  const changeText = `${isPositive ? '+' : ''}${token.priceChange24h.toFixed(2)}%`;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors cursor-pointer"
    >
      {/* Token logo */}
      {token.logoURI ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={token.logoURI}
          alt={token.symbol}
          className="w-8 h-8 rounded-lg object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
          <span className="text-xs font-bold text-zinc-400">
            {token.symbol.charAt(0)}
          </span>
        </div>
      )}

      {/* Token symbol */}
      <span className="text-white font-bold text-sm whitespace-nowrap">
        {token.symbol}
      </span>

      {/* Price change (after symbol) */}
      <span
        className={`text-sm font-bold font-mono ${
          isPositive ? 'text-emerald-400' : 'text-red-400'
        }`}
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {changeText}
      </span>
    </button>
  );
};

export function TokenTicker({ onTokenSelect }: TokenTickerProps) {
  const [tokens, setTokens] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/trending');
        if (response.ok) {
          const data = await response.json();
          setTokens(data.tokens || []);
        }
      } catch (error) {
        console.error('Failed to fetch trending:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  if (loading || tokens.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full overflow-hidden bg-zinc-900/50 border-y border-zinc-800">
      {/* Left fade gradient */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent z-10" />

      {/* Right fade gradient */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent z-10" />

      <Marquee
        pauseOnHover
        className="py-2 [--duration:120s] [--gap:0.5rem]"
      >
        {tokens.map((token) => (
          <TokenItem
            key={token.address}
            token={token}
            onClick={() => onTokenSelect(token.address)}
          />
        ))}
      </Marquee>
    </div>
  );
}
