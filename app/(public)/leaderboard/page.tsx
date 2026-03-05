import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

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
  const sovereignCount = leaderboard.filter(d => d.tier === 'sovereign').length;

  return (
    <div className="min-h-screen pb-20 bg-black relative font-mono">
      {/* Header */}
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b border-white-20 bg-black-1 relative overflow-hidden z-10">
        {/* Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 3px)',
        }} />

        <div className="relative z-10">
          <div className="mb-3 sm:mb-4">
            <div className="text-white-40 text-xs tracking-widest mb-2">$ cat /sys/rankings/classified.db</div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-mono font-extrabold uppercase text-white leading-tight">
              CLASSIFIED <span className="text-white-60">RANKINGS</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed text-white-40 mb-6 sm:mb-8 font-mono">
            Ranked operatives sorted by launch history, on-chain security metrics, and trust score.
          </p>

          {/* Stats bar */}
          {totalDevs > 0 && (
            <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-10 border border-white-20 p-3 bg-black-2 inline-flex">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-white-40 text-xs">[SUBJECTS]</span>
                <span className="text-xs sm:text-sm font-bold text-white">{totalDevs}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-white-40 text-xs">[AVG_SCORE]</span>
                <span className="text-xs sm:text-sm font-bold text-white">{avgScore}</span>
              </div>
              {sovereignCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-white-40 text-xs">[SOVEREIGN]</span>
                  <span className="text-xs sm:text-sm font-bold text-white">{sovereignCount}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Section */}
      {top3.length > 0 && (
        <div className="px-3 sm:px-4 md:px-12 py-6 sm:py-8 md:py-12 bg-black border-b border-white-20">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <span className="text-white-40 text-xs">&#9608;</span>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-white-40">
                TOP {top3.length} OPERATIVES
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
          <div className="px-4 sm:px-6 md:px-12 py-3 sm:py-4 bg-black-1 border-b border-white-20">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-white-40">
              Remaining {rest.length} Subject{rest.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Table Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-6 md:px-12 py-4 bg-black/95 border-b border-white-20 text-xs font-bold uppercase tracking-widest text-white-40 sticky top-[57px] sm:top-[61px] md:top-[65px] z-30 backdrop-blur-sm">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Subject</div>
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
          <div className="w-20 h-20 border border-dashed border-white-20 mx-auto mb-6 flex items-center justify-center bg-black-1">
            <span className="text-white-40 text-2xl font-mono">?</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-mono font-extrabold uppercase mb-4 text-white">NO SUBJECTS FOUND</h3>
          <p className="text-white-40 mb-6 max-w-md mx-auto font-mono text-sm">
            The database is empty. Connect your wallet to register as the first operative.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase text-sm border border-white hover:bg-white-90 transition-colors font-mono">
            REGISTER IDENTITY <ArrowRight size={18} />
          </Link>
        </div>
      )}
    </div>
  );
}
