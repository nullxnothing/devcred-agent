'use client';

import { CheckCircle2, AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { useState, useCallback } from 'react';
import { getTokenScoreColor } from '@/lib/score-colors';

interface TokenCardProps {
  token: {
    mint: string;
    name: string;
    symbol: string;
    launchDate: string;
    migrated: boolean;
    marketCap: number | null;
    volume24h: number | null;
    totalVolume?: number | null;
    athMarketCap?: number | null;
    status: string;
    score: number;
  };
}

function formatMarketCap(value: number | null): string {
  if (!value) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function TokenCard({ token }: TokenCardProps) {
  const [copied, setCopied] = useState(false);
  const score = typeof token.score === 'string' ? parseFloat(token.score) : token.score;
  const isRug = token.status === 'rug';
  const scoreColor = getTokenScoreColor(score);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(token.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [token.mint]);

  const dexScreenerUrl = `https://dexscreener.com/solana/${token.mint}`;
  const truncatedMint = `${token.mint.slice(0, 6)}...${token.mint.slice(-4)}`;

  // Simplified card styling - consistent shadows, score color indicates quality
  const cardStyles = isRug
    ? 'border-2 border-error/40 bg-black-2'
    : 'border-2 border-white-20 bg-black-2';

  // Subtle top accent strip based on score
  const stripColor = isRug
    ? 'bg-error'
    : score >= 90
    ? 'bg-score-legend'
    : score >= 70
    ? 'bg-white'
    : 'bg-white/30';

  return (
    <div className={`${cardStyles} lg:hover:translate-x-0.5 lg:hover:-translate-y-0.5 active:scale-[0.995] transition-transform relative overflow-hidden`}>
      {/* Subtle top accent */}
      <div className={`h-1 ${stripColor}`} />

      <div className="p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div className="flex-1 min-w-0">
            {/* Token name and status row */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-white truncate max-w-[200px] sm:max-w-none">{token.name}</h3>
              <span className="font-mono text-xs sm:text-sm text-white/50">${token.symbol}</span>
              {token.status === 'active' && (
                <span className="flex items-center gap-1 text-success text-[9px] sm:text-[10px] font-bold uppercase shrink-0">
                  <CheckCircle2 size={10} /> Active
                </span>
              )}
              {token.status === 'rug' && (
                <span className="flex items-center gap-1 text-error text-[9px] sm:text-[10px] font-bold uppercase shrink-0">
                  <AlertTriangle size={10} /> Rug
                </span>
              )}
              {token.migrated && (
                <span className="text-white text-[9px] sm:text-[10px] font-bold uppercase shrink-0">
                  Migrated
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 sm:gap-1.5 font-mono text-[10px] sm:text-xs text-white-60 hover:text-white active:text-white transition-colors cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 p-1 -m-1"
                title={`Click to copy: ${token.mint}`}
                aria-label={copied ? 'Contract address copied' : `Copy contract address ${truncatedMint}`}
              >
                <span className="group-hover:underline">{truncatedMint}</span>
                {copied ? (
                  <Check size={10} className="text-success sm:w-3 sm:h-3" aria-hidden="true" />
                ) : (
                  <Copy size={10} className="opacity-50 group-hover:opacity-100 sm:w-3 sm:h-3" aria-hidden="true" />
                )}
              </button>
              <a
                href={dexScreenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 p-1 -m-1"
                aria-label={`View ${token.name} on DexScreener (opens in new tab)`}
              >
                DexScreener <ExternalLink size={10} className="sm:w-3 sm:h-3" aria-hidden="true" />
              </a>
            </div>

            {/* Metadata row - compact */}
            <div className="flex gap-2 sm:gap-3 md:gap-4 text-[10px] sm:text-xs text-white-60 flex-wrap">
              <span>{formatDate(token.launchDate)}</span>
              <span>MCap: {formatMarketCap(token.marketCap)}</span>
              {token.athMarketCap && token.athMarketCap !== token.marketCap && (
                <span className="hidden xs:inline">ATH: {formatMarketCap(token.athMarketCap)}</span>
              )}
              <span>Vol: {formatMarketCap(token.volume24h)}</span>
            </div>
          </div>

          {/* Score section - simplified */}
          <div className="flex items-center gap-3 sm:gap-4 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4 md:pl-6 shrink-0">
            <div className="text-center">
              <div className="text-[9px] sm:text-[10px] uppercase font-bold text-white/40 mb-0.5">Score</div>
              <div className={`text-xl sm:text-2xl font-mono font-bold ${scoreColor.textClass}`} aria-label={`Token score: ${Math.round(score)} out of 150`}>
                {Math.round(score)}
              </div>
            </div>
            {isRug && (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-error-border bg-error-light flex items-center justify-center" role="img" aria-label="Warning: This token has been flagged as a rug pull">
                <AlertTriangle size={14} className="text-error sm:w-4 sm:h-4" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
