import Link from 'next/link';
import { Trophy, ArrowRight, Users, TrendingUp, Crown } from 'lucide-react';

import { getLeaderboardData, LeaderboardEntry } from '@/lib/data-fetching';
import { TopThreeRowClient, LeaderboardRowClient } from '@/components/leaderboard/LeaderboardRow';

export const revalidate = 60;

async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await getLeaderboardData(50);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

export default async function LeaderboardPage() {
  const leaderboard = await getLeaderboard();
  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const totalDevs = leaderboard.length;
  const avgScore = totalDevs > 0 ? Math.round(leaderboard.reduce((sum, d) => sum + (Number(d.score) || 0), 0) / totalDevs) : 0;
  const legendCount = leaderboard.filter(d => d.tier === 'legend').length;

  return (
    <div className="min-h-screen pb-20 bg-cream">
      {/* Header */}
      <div className="px-6 md:px-12 py-12 md:py-20 border-b-2 border-dark bg-white relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#3B3B3B 1px, transparent 1px), linear-gradient(90deg, #3B3B3B 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-accent flex items-center justify-center border-2 border-dark shadow-[4px_4px_0px_0px_#000]">
              <Trophy size={28} className="text-cream" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black font-display-mock text-dark">
              TOP <span className="text-accent">BUILDERS</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-dark/60 mb-8">
            Ranking the most successful developers based on launch history, security, and community trust.
          </p>

          {/* Stats bar */}
          {totalDevs > 0 && (
            <div className="flex flex-wrap gap-6 md:gap-10">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-accent" />
                <span className="text-sm font-bold text-dark">{totalDevs} Verified Devs</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-accent" />
                <span className="text-sm font-bold text-dark">{avgScore} Avg Score</span>
              </div>
              {legendCount > 0 && (
                <div className="flex items-center gap-2">
                  <Crown size={18} className="text-[#FFD700]" />
                  <span className="text-sm font-bold text-dark">{legendCount} Legend{legendCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Section */}
      {top3.length > 0 && (
        <div className="px-4 md:px-12 py-8 md:py-12 bg-cream border-b-2 border-dark">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
              <Trophy size={20} className="text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-dark/60">
                Top {top3.length}
              </h2>
            </div>
            <div className="flex flex-col gap-4">
              {top3.map((dev, idx) => (
                <TopThreeRowClient key={dev.id} dev={dev} position={(idx + 1) as 1 | 2 | 3} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {rest.length > 0 && (
        <div className="w-full">
          {/* Section Header */}
          <div className="px-6 md:px-12 py-4 bg-white border-b border-dark/20">
            <span className="text-xs font-bold uppercase tracking-widest text-dark/50">
              Remaining {rest.length} Developer{rest.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 md:px-12 py-4 bg-cream border-b border-dark/20 text-xs font-bold uppercase tracking-widest text-dark/50 sticky top-[73px] z-30 backdrop-blur-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-4">Developer</div>
            <div className="col-span-2">Tier</div>
            <div className="col-span-3">Progress</div>
            <div className="col-span-2 text-right">Score</div>
          </div>

          {/* Rows */}
          {rest.map((dev, idx) => (
            <LeaderboardRowClient key={dev.id} dev={dev} index={idx} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {leaderboard.length === 0 && (
        <div className="p-12 md:p-24 text-center">
          <div className="w-20 h-20 bg-accent/10 border-2 border-dashed border-accent/30 mx-auto mb-6 flex items-center justify-center">
            <Trophy size={36} className="text-accent/50" />
          </div>
          <h3 className="text-2xl md:text-3xl font-black font-display-mock mb-4 text-dark">No Devs Yet</h3>
          <p className="text-dark/50 mb-6 max-w-md mx-auto">
            The leaderboard is waiting for its first legends. Connect your wallet to claim your spot.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-cream font-bold uppercase text-sm border-2 border-accent hover:bg-accent-light transition-colors shadow-[4px_4px_0px_0px_#3B3B3B]">
            Claim Your Profile <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
