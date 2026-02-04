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
    <div className="min-h-screen pb-20 bg-cream relative">
      {/* Subtle grid texture background */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />
      
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden z-10">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-accent flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] sm:shadow-[4px_4px_0px_0px_var(--border)] shrink-0">
              <Trophy size={20} className="text-cream sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black font-display-mock text-dark leading-tight">
              TOP <span className="text-accent">BUILDERS</span>
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-text-muted mb-6 sm:mb-8">
            Ranking the most successful developers based on launch history, security, and community trust.
          </p>

          {/* Stats bar */}
          {totalDevs > 0 && (
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-10">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Users size={16} className="text-accent sm:w-[18px] sm:h-[18px]" />
                <span className="text-xs sm:text-sm font-bold text-dark">{totalDevs} Verified Devs</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <TrendingUp size={16} className="text-accent sm:w-[18px] sm:h-[18px]" />
                <span className="text-xs sm:text-sm font-bold text-dark">{avgScore} Avg Score</span>
              </div>
              {legendCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Crown size={16} className="text-score-legend sm:w-[18px] sm:h-[18px]" />
                  <span className="text-xs sm:text-sm font-bold text-dark">{legendCount} Legend{legendCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Section */}
      {top3.length > 0 && (
        <div className="px-3 sm:px-4 md:px-12 py-6 sm:py-8 md:py-12 bg-cream border-b-2 border-border">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Trophy size={18} className="text-accent sm:w-5 sm:h-5" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-text-muted">
                Top {top3.length}
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:gap-4">
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
          <div className="px-4 sm:px-6 md:px-12 py-3 sm:py-4 bg-card border-b border-border">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-text-muted">
              Remaining {rest.length} Developer{rest.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Table Header - uses CSS variable for navbar height */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-6 md:px-12 py-4 bg-cream/95 border-b border-border text-xs font-bold uppercase tracking-widest text-text-muted sticky top-[57px] sm:top-[61px] md:top-[65px] z-30 backdrop-blur-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Developer</div>
            <div className="col-span-4">Progress</div>
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
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            The leaderboard is waiting for its first legends. Connect your wallet to claim your spot.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-cream font-bold uppercase text-sm border-2 border-accent hover:bg-accent-light transition-colors shadow-[4px_4px_0px_0px_var(--border)]">
            Claim Your Profile <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
