'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { KolBadge } from '@/components/ui/KolBadge';
import { ProfileHoverCard } from '@/components/ui/ProfileHoverCard';
import { getDevScoreColor } from '@/lib/score-colors';

export interface LeaderboardRowProps {
  id: string;
  rank: number;
  twitterHandle: string | null;
  twitterName: string | null;
  avatarUrl: string | null;
  primaryWallet?: string | null;
  score: number;
  tier: string;
  tierName: string;
  tierColor: string;
  isVerified?: boolean; // deprecated, kept for API compatibility
  isKol: boolean;
}

const medalColors = {
  1: { bg: 'bg-medal-gold', text: 'text-black', border: 'border-medal-gold' },
  2: { bg: 'bg-medal-silver', text: 'text-white', border: 'border-medal-silver' },
  3: { bg: 'bg-medal-bronze', text: 'text-black', border: 'border-medal-bronze' },
};

// Score glow classes by tier
const getScoreGlowClass = (tier: string): string => {
  switch (tier.toLowerCase()) {
    case 'sovereign': return 'score-glow-legend';
    case 'cleared': return 'score-glow-elite';
    case 'vetted': return 'score-glow-proven';
    default: return '';
  }
};

// Progress bar classes by tier (animated gradients)
const getProgressBarClass = (tier: string): string => {
  switch (tier.toLowerCase()) {
    case 'sovereign': return 'progress-legend';
    case 'cleared': return 'progress-elite';
    case 'vetted': return 'progress-proven';
    case 'tracked': return 'progress-builder';
    default: return '';
  }
};

export function TopThreeRowClient({ dev, position }: { dev: LeaderboardRowProps; position: 1 | 2 | 3 }) {
  const score = Math.round(Number(dev.score) || 0);
  const scoreColor = getDevScoreColor(score);
  const medal = medalColors[position];

  // Use twitterHandle if available, otherwise use wallet address for profile link
  const profileIdentifier = dev.twitterHandle || dev.primaryWallet || dev.id;
  const displayName = dev.twitterName || (dev.primaryWallet ? `Dev ${dev.primaryWallet.slice(0, 4)}...${dev.primaryWallet.slice(-4)}` : 'Unknown Dev');
  const displayHandle = dev.twitterHandle || (dev.primaryWallet ? `${dev.primaryWallet.slice(0, 8)}...` : 'unknown');

  return (
    <ProfileHoverCard
      twitterHandle={dev.twitterHandle}
      twitterName={displayName}
      avatarUrl={dev.avatarUrl}
      score={dev.score}
      tier={dev.tier}
      tierName={dev.tierName}
      tierColor={dev.tierColor}
      rank={dev.rank}
    >
      <Link
        href={`/profile/${encodeURIComponent(profileIdentifier)}`}
        className="group flex items-center gap-2.5 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5 bg-black-2 border-2 border-white-20 lg:hover:bg-white/10 active:bg-white/5 transition-colors lg:hover:translate-x-0.5 lg:hover:translate-y-0.5"
      >
        {/* Rank Medal */}
        <div className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 ${medal.bg} border-2 ${medal.border} flex items-center justify-center shrink-0`}>
          <span className={`font-mono font-bold text-base sm:text-lg md:text-xl ${medal.text}`}>
            {position}
          </span>
        </div>

        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar
            src={dev.avatarUrl}
            alt={displayName}
            size="md"
            className="border-2 border-white-20 sm:hidden"
          />
          <Avatar
            src={dev.avatarUrl}
            alt={displayName}
            size="lg"
            className="border-2 border-white-20 hidden sm:block"
          />
        </div>

        {/* Name + Handle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3 className="font-bold text-base sm:text-lg md:text-xl leading-tight text-white lg:group-hover:text-white transition-colors truncate">
              {displayName}
            </h3>
            {dev.isKol && <KolBadge size="sm" showGlow={false} />}
          </div>
          <p className="text-[10px] sm:text-xs md:text-sm font-mono text-white-40 truncate">
            {dev.twitterHandle ? `@${dev.twitterHandle}` : displayHandle}
          </p>
        </div>

        {/* Tier - hidden on mobile */}
        <div className="hidden sm:block shrink-0">
          <TierBadge
            tier={dev.tier}
            tierName={dev.tierName}
            tierColor={dev.tierColor}
            size="md"
          />
        </div>

        {/* Score */}
        <div className="text-right shrink-0">
          <div className={`text-2xl sm:text-3xl md:text-4xl font-mono font-bold ${scoreColor.textClass} ${getScoreGlowClass(dev.tier)}`}>
            {score}
          </div>
        </div>
      </Link>
    </ProfileHoverCard>
  );
}

export function LeaderboardRowClient({
  dev,
  index
}: {
  dev: LeaderboardRowProps;
  index: number;
}) {
  const scoreColor = getDevScoreColor(dev.score);
  const scorePercent = Math.min(100, Math.max(0, (dev.score / 740) * 100));

  // Use twitterHandle if available, otherwise use wallet address for profile link
  const profileIdentifier = dev.twitterHandle || dev.primaryWallet || dev.id;
  const displayName = dev.twitterName || (dev.primaryWallet ? `Dev ${dev.primaryWallet.slice(0, 4)}...${dev.primaryWallet.slice(-4)}` : 'Unknown Dev');
  const displayHandle = dev.twitterHandle || (dev.primaryWallet ? `${dev.primaryWallet.slice(0, 8)}...` : 'unknown');

  const tierBorderColors: Record<string, string> = {
    sovereign: 'border-l-score-legend',
    cleared: 'border-l-score-elite',
    operative: 'border-l-score-rising',
    vetted: 'border-l-score-proven',
    tracked: 'border-l-score-builder',
    filed: 'border-l-score-verified',
    flagged: 'border-l-score-penalized',
    ghost: 'border-l-transparent',
  };
  const borderColor = tierBorderColors[dev.tier] || 'border-l-transparent';

  return (
    <ProfileHoverCard
      twitterHandle={dev.twitterHandle}
      twitterName={displayName}
      avatarUrl={dev.avatarUrl}
      score={dev.score}
      tier={dev.tier}
      tierName={dev.tierName}
      tierColor={dev.tierColor}
      rank={dev.rank}
    >
      <Link
        href={`/profile/${encodeURIComponent(profileIdentifier)}`}
        className={`group relative grid grid-cols-12 gap-1.5 sm:gap-2 md:gap-3 px-3 sm:px-4 md:px-12 py-4 md:py-5 items-center transition-all cursor-pointer border-l-4 ${borderColor} bg-black-2 mb-1 lg:hover:-translate-y-0.5 active:bg-white/5`}
      >
        {/* Rank */}
        <div className="col-span-2 md:col-span-1 flex items-center justify-center">
          <span className="font-mono font-extrabold uppercase text-lg sm:text-xl md:text-2xl text-white-40">
            #{dev.rank}
          </span>
        </div>

        {/* Avatar + Name + Tier (grouped) */}
        <div className="col-span-10 md:col-span-5 flex items-center gap-2 sm:gap-3">
          <div className="relative shrink-0">
            <Avatar
              src={dev.avatarUrl}
              alt={displayName}
              size="sm"
              className="border-2 border-white-20 sm:hidden"
            />
            <Avatar
              src={dev.avatarUrl}
              alt={displayName}
              size="md"
              className="border-2 border-white-20 hidden sm:block"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-sm sm:text-base md:text-lg lg:text-xl leading-tight mb-0.5 text-white lg:group-hover:text-white transition-colors flex items-center gap-1.5 sm:gap-2">
              <span className="truncate">{displayName}</span>
              {dev.isKol && <KolBadge size="sm" showGlow={false} />}
              <ExternalLink size={12} className="opacity-0 lg:group-hover:opacity-100 transition-opacity shrink-0 hidden sm:block sm:w-3.5 sm:h-3.5" />
            </div>
            <div className="text-[10px] sm:text-xs font-mono text-white-40 truncate">
              {dev.twitterHandle ? `@${dev.twitterHandle}` : displayHandle}
            </div>
            {/* Tier Badge - Inline with name on desktop */}
            {dev.tier !== 'ghost' && (
              <div className="hidden md:block mt-1">
                <TierBadge
                  tier={dev.tier}
                  tierName={dev.tierName}
                  tierColor={dev.tierColor}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>

        {/* Score Progress Bar - Desktop (wider) */}
        <div className="hidden md:flex col-span-4 items-center gap-3">
          <div className="flex-1 h-2.5 bg-black-1 rounded-full overflow-hidden border border-white-20">
            <div
              className={`h-full ${getProgressBarClass(dev.tier) || scoreColor.bgClass} transition-all duration-500`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-white-40 w-10 text-right">{Math.round(scorePercent)}%</span>
        </div>

        {/* Score + Mobile tier */}
        <div className="col-span-12 md:col-span-2 flex items-center justify-between md:justify-end mt-2 md:mt-0 pl-10 sm:pl-12 md:pl-0">
          <div className="flex md:hidden items-center gap-2">
            {dev.tier !== 'ghost' && (
              <TierBadge
                tier={dev.tier}
                tierName={dev.tierName}
                tierColor={dev.tierColor}
                size="sm"
              />
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className={`text-xl sm:text-2xl md:text-3xl font-mono font-bold ${scoreColor.textClass} ${getScoreGlowClass(dev.tier)}`}>
              {dev.score}
            </span>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="col-span-12 md:hidden pl-10 sm:pl-12 mt-1">
          <div className="h-1.5 sm:h-2 bg-black-1 rounded-full overflow-hidden border border-white-20">
            <div
              className={`h-full ${getProgressBarClass(dev.tier) || scoreColor.bgClass}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </Link>
    </ProfileHoverCard>
  );
}
