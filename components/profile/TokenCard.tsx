'use client';

import { Shield, CheckCircle2, AlertTriangle, ExternalLink, Copy, Check, Star, Trophy, Flame, Rocket } from 'lucide-react';
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
  const isElite = score >= 90;
  const isStrong = score >= 75 && score < 90;
  const isRug = token.status === 'rug';

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

  const cardStyles = isRug
    ? 'border-2 border-red-500/50 bg-white shadow-[4px_4px_0px_0px_#991B1B]'
    : isElite
    ? 'border-2 border-amber-500 bg-white shadow-[6px_6px_0px_0px_#D4AF37]'
    : isStrong
    ? 'border-2 border-orange-500 bg-white shadow-[4px_4px_0px_0px_#FF6D00]'
    : 'border-2 border-dark/30 bg-white shadow-[4px_4px_0px_0px_#3B3B3B]';

  const stripGradient = isRug
    ? 'bg-gradient-to-r from-red-600 to-red-500'
    : isElite
    ? 'bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400'
    : isStrong
    ? 'bg-gradient-to-r from-orange-500 to-accent'
    : score >= 50
    ? 'bg-gradient-to-r from-accent to-accent/80'
    : 'bg-gradient-to-r from-gray-600 to-gray-500';

  return (
    <div className={`${cardStyles} hover:translate-x-1 hover:-translate-y-1 transition-transform relative overflow-hidden`}>
      <div className={`h-1 ${stripGradient}`} />

      {isElite && (
        <div className="absolute top-1 right-0 bg-amber-500 text-dark text-[10px] font-black uppercase px-3 py-1 flex items-center gap-1">
          <Trophy size={12} /> Elite
        </div>
      )}
      {isStrong && !isElite && (
        <div className="absolute top-1 right-0 bg-orange-500 text-dark text-[10px] font-black uppercase px-3 py-1 flex items-center gap-1">
          <Rocket size={12} /> Strong
        </div>
      )}

      <div className="p-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-2xl font-bold text-dark">{token.name}</h3>
            <span className="font-mono text-sm text-dark/60">${token.symbol}</span>
            {token.status === 'active' ? (
              <span className="flex items-center gap-1 text-green-400 text-xs font-bold uppercase border border-green-400 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Active
              </span>
            ) : token.status === 'rug' ? (
              <span className="flex items-center gap-1 text-red-400 text-xs font-bold uppercase border border-red-400 px-2 py-0.5 rounded-full">
                <AlertTriangle size={12} /> Rug
              </span>
            ) : (
              <span className="flex items-center gap-1 text-dark/50 text-xs font-bold uppercase border border-dark/30 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
            {token.migrated && (
              <span className="flex items-center gap-1 text-accent text-xs font-bold uppercase border border-accent px-2 py-0.5 rounded-full">
                Migrated
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 font-mono text-xs text-dark/60 hover:text-accent transition-colors cursor-pointer group"
              title={`Click to copy: ${token.mint}`}
            >
              <span className="group-hover:underline">{truncatedMint}</span>
              {copied ? (
                <Check size={12} className="text-green-600" />
              ) : (
                <Copy size={12} className="opacity-50 group-hover:opacity-100" />
              )}
            </button>
            <a
              href={dexScreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              DexScreener <ExternalLink size={12} />
            </a>
          </div>

          <div className="flex gap-6 text-sm text-dark/70 flex-wrap">
            <span>Launched: {formatDate(token.launchDate)}</span>
            <span>MCap: {formatMarketCap(token.marketCap)}</span>
            {token.athMarketCap && token.athMarketCap !== token.marketCap && (
              <span className={isElite ? 'font-semibold text-amber-600' : ''}>ATH: {formatMarketCap(token.athMarketCap)}</span>
            )}
            <span>Vol 24h: {formatMarketCap(token.volume24h)}</span>
            {token.totalVolume && (
              <span>Total Vol: {formatMarketCap(token.totalVolume)}</span>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-8 border-t md:border-t-0 md:border-l ${isElite ? 'border-amber-500/40' : 'border-dark/10'} pt-4 md:pt-0 md:pl-8`}>
          <div className="text-center">
            <div className={`text-xs uppercase font-bold ${isElite ? 'text-amber-600' : 'text-dark/50'}`}>Token Score</div>
            <div className={`text-3xl font-black font-display-mock ${getTokenScoreColor(score).textClass}`}>
              {Math.round(score)}
            </div>
          </div>
          <div className={`hidden md:flex w-12 h-12 rounded-full border-2 items-center justify-center ${
            isRug
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : isElite
              ? 'border-amber-500 bg-amber-500 text-dark'
              : isStrong
              ? 'border-orange-500 bg-orange-500/10 text-orange-500'
              : 'border-accent/50 bg-white'
          }`}>
            {isRug ? <AlertTriangle size={24} /> : isElite ? <Star size={24} fill="currentColor" /> : <Shield size={24} className="text-dark" />}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
