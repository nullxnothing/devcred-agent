import Link from 'next/link';
import { ExternalLink, Trophy, Star, TrendingUp, Users, ArrowRight } from 'lucide-react';

import { getKolLeaderboardData, KolLeaderboardEntry } from '@/lib/data-fetching';
import { getDevScoreColor } from '@/lib/score-colors';
import { TierBadge } from '@/components/ui/TierBadge';
import { KolBadge } from '@/components/ui/KolBadge';
import { Avatar } from '@/components/ui/Avatar';
import { AddressDisplay } from '@/components/ui/CopyButton';

export const revalidate = 300;

async function getKolLeaderboard(): Promise<KolLeaderboardEntry[]> {
  try {
    return await getKolLeaderboardData(50);
  } catch (error) {
    console.error('Error fetching KOL leaderboard:', error);
    return [];
  }
}

function KolRow({ kol, index }: { kol: KolLeaderboardEntry; index: number }) {
  const hasProfile = kol.user !== null;
  const score = kol.user?.score || 0;
  const scoreColor = getDevScoreColor(score);

  const winRate = kol.wins + kol.losses > 0
    ? Math.round((kol.wins / (kol.wins + kol.losses)) * 100)
    : 0;

  const profileIdentifier = kol.user?.twitterHandle || kol.user?.primaryWallet || kol.walletAddress;
  const profileUrl = `/profile/${encodeURIComponent(profileIdentifier)}`;

  const displayName = hasProfile
    ? (kol.user!.twitterName || `Dev ${kol.walletAddress.slice(0, 4)}...${kol.walletAddress.slice(-4)}`)
    : kol.name;
  const displayHandle = hasProfile && kol.user!.twitterHandle
    ? `@${kol.user!.twitterHandle}`
    : null;

  return (
    <Link
      href={profileUrl}
      className={`group grid grid-cols-12 gap-3 md:gap-4 px-4 md:px-8 py-5 border-b border-white-20 items-center hover:bg-black-3 transition-all ${index % 2 === 0 ? 'bg-black' : 'bg-black-1'}`}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center">
        {kol.kolscanRank && kol.kolscanRank <= 3 ? (
          <div className={`w-8 h-8 flex items-center justify-center font-mono font-bold text-sm border ${
            kol.kolscanRank === 1 ? 'bg-white text-black border-white' :
            kol.kolscanRank === 2 ? 'bg-black-2 text-white-90 border-white-60' :
            'bg-black-2 text-white-60 border-white-40'
          }`}>
            {kol.kolscanRank}
          </div>
        ) : (
          <span className="font-mono font-bold text-white-40">#{kol.kolscanRank || '-'}</span>
        )}
      </div>

      {/* Avatar + Name */}
      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
        <div className="relative shrink-0">
          {hasProfile ? (
            <Avatar
              src={kol.user!.avatarUrl}
              alt={displayName}
              size="md"
              className="border border-white-20"
            />
          ) : (
            <div className="w-10 h-10 bg-black-2 border border-white-20 flex items-center justify-center">
              <Star size={18} className="text-white-60" />
            </div>
          )}
          <div className="absolute -top-1 -right-1">
            <KolBadge size="sm" showGlow={false} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono font-bold text-sm md:text-base leading-tight mb-0.5 group-hover:text-white transition-colors flex items-center gap-2 truncate text-white-90">
            {displayName}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <div className="text-xs font-mono text-white-40 truncate">
            {displayHandle ? displayHandle : <AddressDisplay address={kol.walletAddress} showCopy={false} />}
          </div>
        </div>
      </div>

      {/* Win/Loss - Desktop */}
      <div className="hidden md:flex col-span-2 items-center gap-2 font-mono">
        <span className="text-white font-bold">{kol.wins}W</span>
        <span className="text-white-20">/</span>
        <span className="text-red font-bold">{kol.losses}L</span>
        <span className="text-xs text-white-40">({winRate}%)</span>
      </div>

      {/* PnL - Desktop */}
      <div className="hidden md:block col-span-2 font-mono">
        {kol.pnlSol !== null ? (
          <span className={`font-bold ${kol.pnlSol >= 0 ? 'text-white' : 'text-red'}`}>
            {kol.pnlSol >= 0 ? '+' : ''}{kol.pnlSol.toLocaleString()} SOL
          </span>
        ) : (
          <span className="text-white-20">-</span>
        )}
      </div>

      {/* Tier + Score */}
      <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-3">
        {hasProfile && kol.user!.tier !== 'ghost' && (
          <TierBadge
            tier={kol.user!.tier}
            tierName={kol.user!.tierName}
            tierColor={kol.user!.tierColor}
            size="sm"
          />
        )}
        <div className={`text-2xl md:text-3xl font-mono font-bold ${hasProfile ? scoreColor.textClass : 'text-white-20'}`}>
          {hasProfile ? score : '-'}
        </div>
      </div>

      {/* Mobile: W/L and PnL */}
      <div className="col-span-12 md:hidden flex items-center justify-between pl-14 -mt-1 font-mono">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-white font-bold">{kol.wins}W</span>
          <span className="text-white-20">/</span>
          <span className="text-red font-bold">{kol.losses}L</span>
        </div>
        {kol.pnlSol !== null && (
          <span className={`text-xs font-bold ${kol.pnlSol >= 0 ? 'text-white' : 'text-red'}`}>
            {kol.pnlSol >= 0 ? '+' : ''}{kol.pnlSol.toLocaleString()} SOL
          </span>
        )}
      </div>
    </Link>
  );
}

export default async function KolLeaderboardPage() {
  const kols = await getKolLeaderboard();

  const claimedCount = kols.filter(k => k.isClaimed).length;
  const totalPnl = kols.reduce((sum, k) => sum + (k.pnlSol || 0), 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-6 md:px-12 py-12 md:py-20 border-b border-white-20 bg-black relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-black-2 flex items-center justify-center border border-white-20">
              <Star size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-5xl md:text-8xl font-mono font-extrabold uppercase text-white">
                KOL BOARD
              </h1>
            </div>
          </div>
          <p className="text-lg md:text-xl max-w-2xl font-mono leading-relaxed text-white-60 mb-8">
            &gt; Top Key Opinion Leaders ranked by their Blacklist threat scores.
            Claim your profile to showcase your record.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-6 md:gap-10 font-mono">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-white-60" />
              <span className="text-sm font-bold text-white-90">{kols.length} KOLs Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-white-60" />
              <span className="text-sm font-bold text-white-90">{claimedCount} Profiles Claimed</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-white-60" />
              <span className="text-sm font-bold text-white-90">{totalPnl.toLocaleString()} SOL Total PnL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {kols.length > 0 && (
        <div className="w-full max-w-6xl mx-auto">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-black-1 border-b border-white-20 text-xs font-mono font-bold uppercase tracking-widest text-white-40 sticky top-[73px] z-30 backdrop-blur-sm">
            <div className="col-span-1">RANK</div>
            <div className="col-span-4">SUBJECT</div>
            <div className="col-span-2">WIN/LOSS</div>
            <div className="col-span-2">PNL</div>
            <div className="col-span-3 text-right">SCORE</div>
          </div>

          {/* Rows */}
          {kols.map((kol, idx) => (
            <KolRow key={kol.id} kol={kol} index={idx} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {kols.length === 0 && (
        <div className="p-12 md:p-24 text-center max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-black-2 border border-dashed border-white-20 mx-auto mb-6 flex items-center justify-center">
            <Star size={36} className="text-white-40" />
          </div>
          <h3 className="text-2xl md:text-3xl font-mono font-extrabold uppercase mb-4 text-white">NO SUBJECTS</h3>
          <p className="text-white-60 font-mono mb-6">
            &gt; Run the KOL scraper to populate this database.
          </p>
          <code className="block bg-black-2 text-white-60 px-4 py-3 text-sm font-mono mb-6 border border-white-20">
            npx tsx scripts/crawl-kols.ts
          </code>
          <Link href="/leaderboard" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-mono font-bold uppercase text-sm border border-white hover:bg-white-90 transition-colors">
            [ VIEW RANKINGS ] <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
