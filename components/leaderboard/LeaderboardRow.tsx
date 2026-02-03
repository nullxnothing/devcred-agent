'use client';

import Link from 'next/link';
import { ExternalLink, BadgeCheck } from 'lucide-react';
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
  isVerified: boolean;
  isKol: boolean;
}

const medalColors = {
  1: { bg: 'bg-[#FFD700]', text: 'text-dark', border: 'border-[#FFD700]' },
  2: { bg: 'bg-[#C0C0C0]', text: 'text-dark', border: 'border-[#C0C0C0]' },
  3: { bg: 'bg-[#CD7F32]', text: 'text-dark', border: 'border-[#CD7F32]' },
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
        className="group flex items-center gap-4 md:gap-6 p-4 md:p-6 bg-white border-2 border-dark hover:bg-cream transition-colors shadow-[4px_4px_0px_0px_#3B3B3B] hover:shadow-[2px_2px_0px_0px_#3B3B3B] hover:translate-x-[2px] hover:translate-y-[2px]"
      >
        {/* Rank Medal */}
        <div className={`w-12 h-12 md:w-14 md:h-14 ${medal.bg} border-2 ${medal.border} flex items-center justify-center shrink-0`}>
          <span className={`font-black text-xl md:text-2xl font-display-mock ${medal.text}`}>
            {position}
          </span>
        </div>

        {/* Avatar */}
        <div className="relative shrink-0">
          <Avatar
            src={dev.avatarUrl}
            alt={displayName}
            size="lg"
            className="border-2 border-dark"
          />
          {dev.isVerified && (
            <div className="absolute -top-1 -right-1 bg-accent text-cream border border-dark p-0.5">
              <BadgeCheck size={12} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Name + Handle */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg md:text-xl leading-tight text-dark group-hover:text-accent transition-colors truncate">
              {displayName}
            </h3>
            {dev.isKol && <KolBadge size="sm" showGlow={false} />}
          </div>
          <p className="text-xs md:text-sm font-mono text-dark/50 truncate">
            {dev.twitterHandle ? `@${dev.twitterHandle}` : displayHandle}
          </p>
        </div>

        {/* Tier */}
        <div className="hidden sm:block">
          <TierBadge
            tier={dev.tier}
            tierName={dev.tierName}
            tierColor={dev.tierColor}
            size="md"
          />
        </div>

        {/* Score */}
        <div className="text-right">
          <div className={`text-3xl md:text-4xl font-black font-display-mock ${scoreColor.textClass}`}>
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
    legend: 'border-l-[#FFD700]',
    elite: 'border-l-purple-500',
    proven: 'border-l-green-500',
    builder: 'border-l-blue-500',
    verified: 'border-l-gray-500',
    penalized: 'border-l-red-600',
    unverified: 'border-l-transparent',
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
        className={`group relative grid grid-cols-12 gap-3 md:gap-4 px-4 md:px-12 py-5 md:py-5 border-b border-dark/10 items-center hover:bg-white transition-all cursor-pointer border-l-4 ${borderColor} ${index % 2 === 0 ? 'bg-cream' : 'bg-white/50'}`}
      >
        {/* Rank */}
        <div className="col-span-2 md:col-span-1 flex items-center justify-center">
          <span className="font-black text-lg md:text-xl font-display-mock text-dark/40">
            #{dev.rank}
          </span>
        </div>

        {/* Avatar + Name */}
        <div className="col-span-10 md:col-span-4 flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar
              src={dev.avatarUrl}
              alt={displayName}
              size="md"
              className="border-2 border-dark/30"
            />
            {dev.isVerified && (
              <div className="absolute -top-1 -right-1 bg-accent text-cream border border-dark p-0.5">
                <BadgeCheck size={12} strokeWidth={3} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-base md:text-lg leading-tight mb-0.5 text-dark group-hover:text-accent transition-colors flex items-center gap-2 truncate">
              {displayName}
              {dev.isKol && <KolBadge size="sm" showGlow={false} />}
              <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="text-xs font-mono text-dark/40 truncate">
              {dev.twitterHandle ? `@${dev.twitterHandle}` : displayHandle}
            </div>
          </div>
        </div>

        {/* Tier Badge - Desktop */}
        <div className="hidden md:flex col-span-2 items-center">
          {dev.tier !== 'unverified' && (
            <TierBadge
              tier={dev.tier}
              tierName={dev.tierName}
              tierColor={dev.tierColor}
              size="sm"
            />
          )}
        </div>

        {/* Score Progress Bar - Desktop */}
        <div className="hidden md:flex col-span-3 items-center gap-3">
          <div className="flex-1 h-2 bg-dark/10 rounded-full overflow-hidden border border-dark/20">
            <div
              className={`h-full ${scoreColor.bgClass} transition-all duration-500`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <span className="text-xs font-mono text-dark/40 w-10 text-right">{Math.round(scorePercent)}%</span>
        </div>

        {/* Score + Mobile tier */}
        <div className="col-span-12 md:col-span-2 flex items-center justify-between md:justify-end mt-2 md:mt-0 pl-14 md:pl-0">
          <div className="flex md:hidden items-center gap-2">
            {dev.tier !== 'unverified' && (
              <TierBadge
                tier={dev.tier}
                tierName={dev.tierName}
                tierColor={dev.tierColor}
                size="sm"
              />
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className={`font-black text-2xl md:text-3xl font-display-mock ${scoreColor.textClass}`}>
              {dev.score}
            </span>
          </div>
        </div>

        {/* Mobile Progress Bar */}
        <div className="col-span-12 md:hidden pl-14 mt-1">
          <div className="h-1.5 bg-dark/10 rounded-full overflow-hidden border border-dark/20">
            <div
              className={`h-full ${scoreColor.bgClass}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>
      </Link>
    </ProfileHoverCard>
  );
}
