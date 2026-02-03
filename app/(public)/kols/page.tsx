import Link from 'next/link';
import { ExternalLink, Trophy, Star, TrendingUp, Users, ArrowRight } from 'lucide-react';

import { getKolLeaderboardData, KolLeaderboardEntry } from '@/lib/data-fetching';
import { getDevScoreColor } from '@/lib/score-colors';
import { TierBadge } from '@/components/ui/TierBadge';
import { KolBadge } from '@/components/ui/KolBadge';
import { Avatar } from '@/components/ui/Avatar';
import { AddressDisplay } from '@/components/ui/CopyButton';

export const revalidate = 300; // Revalidate every 5 minutes

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

  // Use twitterHandle if available, otherwise use wallet address
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
      className={`group grid grid-cols-12 gap-3 md:gap-4 px-4 md:px-8 py-5 border-b border-dark/10 items-center hover:bg-amber-50/50 transition-all ${index % 2 === 0 ? 'bg-cream/30' : 'bg-white/50'}`}
    >
      {/* Rank */}
      <div className="col-span-1 flex items-center">
        {kol.kolscanRank && kol.kolscanRank <= 3 ? (
          <div className={`w-8 h-8 flex items-center justify-center font-black text-sm ${
            kol.kolscanRank === 1 ? 'bg-yellow-400 text-yellow-900' :
            kol.kolscanRank === 2 ? 'bg-gray-300 text-gray-700' :
            'bg-orange-300 text-orange-800'
          }`}>
            {kol.kolscanRank}
          </div>
        ) : (
          <span className="font-bold text-dark/40">#{kol.kolscanRank || '-'}</span>
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
              className="border-2 border-amber-300"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-cyan-400 border-2 border-amber-300 flex items-center justify-center">
              <Star size={18} className="text-white" />
            </div>
          )}
          <div className="absolute -top-1 -right-1">
            <KolBadge size="sm" showGlow={false} />
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm md:text-base leading-tight mb-0.5 group-hover:text-amber-600 transition-colors flex items-center gap-2 truncate">
            {displayName}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
          <div className="text-xs font-mono opacity-50 truncate">
            {displayHandle ? displayHandle : <AddressDisplay address={kol.walletAddress} showCopy={false} />}
          </div>
        </div>
      </div>

      {/* Win/Loss - Desktop */}
      <div className="hidden md:flex col-span-2 items-center gap-2">
        <span className="text-green-600 font-bold">{kol.wins}W</span>
        <span className="text-dark/30">/</span>
        <span className="text-red-500 font-bold">{kol.losses}L</span>
        <span className="text-xs text-dark/40">({winRate}%)</span>
      </div>

      {/* PnL - Desktop */}
      <div className="hidden md:block col-span-2">
        {kol.pnlSol !== null ? (
          <span className={`font-bold ${kol.pnlSol >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {kol.pnlSol >= 0 ? '+' : ''}{kol.pnlSol.toLocaleString()} SOL
          </span>
        ) : (
          <span className="text-dark/30">-</span>
        )}
      </div>

      {/* Tier + Score */}
      <div className="col-span-6 md:col-span-3 flex items-center justify-end gap-3">
        {hasProfile && kol.user!.tier !== 'unverified' && (
          <TierBadge
            tier={kol.user!.tier}
            tierName={kol.user!.tierName}
            tierColor={kol.user!.tierColor}
            size="sm"
          />
        )}
        <div className={`font-black text-2xl md:text-3xl font-display-mock ${hasProfile ? scoreColor.textClass : 'text-dark/20'}`}>
          {hasProfile ? score : '-'}
        </div>
      </div>

      {/* Mobile: W/L and PnL */}
      <div className="col-span-12 md:hidden flex items-center justify-between pl-14 -mt-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-green-600 font-bold">{kol.wins}W</span>
          <span className="text-dark/30">/</span>
          <span className="text-red-500 font-bold">{kol.losses}L</span>
        </div>
        {kol.pnlSol !== null && (
          <span className={`text-xs font-bold ${kol.pnlSol >= 0 ? 'text-green-600' : 'text-red-500'}`}>
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
      <div className="px-6 md:px-12 py-12 md:py-20 border-b-2 border-dark bg-gradient-to-br from-amber-50 via-cream to-cyan-50 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle, #3B3B3B 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-cyan-400 flex items-center justify-center border-2 border-dark shadow-[4px_4px_0px_0px_#3B3B3B]">
              <Star size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-5xl md:text-8xl font-black font-display-mock text-dark">
                  KOL <span className="bg-gradient-to-r from-amber-500 to-cyan-500 bg-clip-text text-transparent">BOARD</span>
                </h1>
              </div>
            </div>
          </div>
          <p className="text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-dark/70 mb-8">
            Top Key Opinion Leaders from Kolscan, ranked by their DevCred scores.
            Claim your profile to showcase your developer reputation.
          </p>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-6 md:gap-10">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-amber-500" />
              <span className="text-sm font-bold">{kols.length} KOLs Tracked</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-500" />
              <span className="text-sm font-bold">{claimedCount} Profiles Claimed</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-green-500" />
              <span className="text-sm font-bold">{totalPnl.toLocaleString()} SOL Total PnL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {kols.length > 0 && (
        <div className="w-full max-w-6xl mx-auto">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-cream-dark/30 border-b border-dark/20 text-xs font-bold uppercase tracking-widest text-dark/50 sticky top-[73px] z-30 backdrop-blur-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">KOL</div>
            <div className="col-span-2">Win/Loss</div>
            <div className="col-span-2">PnL</div>
            <div className="col-span-3 text-right">DevCred Score</div>
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
          <div className="w-20 h-20 bg-amber-100 border-2 border-dashed border-amber-300 mx-auto mb-6 flex items-center justify-center">
            <Star size={36} className="text-amber-400" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black font-display-mock mb-4">No KOLs Yet</h3>
          <p className="text-dark/60 mb-6">
            Run the KOL scraper to populate this leaderboard.
          </p>
          <code className="block bg-dark text-cream px-4 py-3 text-sm font-mono mb-6">
            npx tsx scripts/crawl-kols.ts
          </code>
          <Link href="/leaderboard" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-cream font-bold uppercase text-sm border-2 border-accent hover:bg-accent-dark transition-colors shadow-[4px_4px_0px_0px_#3B3B3B]">
            View Main Leaderboard <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
