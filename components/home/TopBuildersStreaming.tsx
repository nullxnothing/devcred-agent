import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getLeaderboardData, LeaderboardEntry } from '@/lib/data-fetching';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { getDevScoreColor } from '@/lib/score-colors';

async function getTopBuilders(): Promise<LeaderboardEntry[]> {
  try {
    return await getLeaderboardData(3);
  } catch (error) {
    console.error('Error fetching top builders:', error);
    return [];
  }
}

export async function TopBuildersStreaming() {
  const topBuilders = await getTopBuilders();

  if (topBuilders.length === 0) {
    return (
      <div className="bg-black-2 border-2 border-dashed border-white-20 p-8 sm:p-12 text-center">
        <p className="text-base sm:text-lg font-medium text-white-40">No verified developers yet.</p>
        <p className="text-xs sm:text-sm text-white-40/60 mt-2">Be the first to claim your profile!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {topBuilders.map((dev, idx) => {
        const profileIdentifier = dev.twitterHandle || dev.primaryWallet || dev.id;
        const displayName = dev.twitterName || (dev.primaryWallet ? `Dev ${dev.primaryWallet.slice(0, 4)}...${dev.primaryWallet.slice(-4)}` : 'Unknown Dev');
        const displayHandle = dev.twitterHandle ? `@${dev.twitterHandle}` : (dev.primaryWallet ? `${dev.primaryWallet.slice(0, 8)}...` : '');

        return (
          <Link
            key={dev.id}
            href={`/profile/${encodeURIComponent(profileIdentifier)}`}
            className="group bg-black-2 border-2 border-white-20 p-3 sm:p-4 md:p-6 flex items-center justify-between lg:hover:translate-x-1 lg:hover:-translate-y-1 active:scale-[0.99] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6 min-w-0">
              <div
                className={`
                  w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-black text-base sm:text-xl border-2 border-white-20 shrink-0
                  ${idx === 0 ? 'bg-medal-gold text-black' : idx === 1 ? 'bg-medal-silver text-white' : 'bg-medal-bronze text-black'}
                `}
              >
                #{idx + 1}
              </div>
              <Avatar
                src={dev.avatarUrl}
                alt={displayName}
                size="sm"
                className="border-2 border-white-20 sm:hidden shrink-0"
              />
              <Avatar
                src={dev.avatarUrl}
                alt={displayName}
                size="md"
                className="border-2 border-white-20 hidden sm:block shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-base sm:text-lg md:text-xl flex items-center gap-2 text-white">
                  <span className="truncate">{displayName}</span>
                  <span className="hidden sm:inline-block shrink-0">
                    <TierBadge
                      tier={dev.tier}
                      tierName={dev.tierName}
                      tierColor={dev.tierColor}
                      size="sm"
                    />
                  </span>
                </div>
                <div className="text-[10px] sm:text-xs font-mono text-white-40 truncate">{displayHandle}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
              <div className="text-right">
                <div className={`text-xl sm:text-2xl md:text-3xl font-mono font-bold ${getDevScoreColor(dev.score).textClass}`}>
                  {dev.score}
                </div>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border border-white-20 lg:group-hover:bg-white/10 lg:group-hover:border-white lg:group-hover:text-white transition-colors text-white shrink-0">
                <ArrowRight size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export function TopBuildersSkeleton() {
  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-black-2 border-2 border-white-20 p-3 sm:p-4 md:p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/10 animate-pulse" />
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/10 animate-pulse rounded-full" />
            <div>
              <div className="h-5 sm:h-6 w-32 sm:w-40 bg-white/10 animate-pulse rounded mb-2" />
              <div className="h-3 sm:h-4 w-24 bg-white/10 animate-pulse rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="h-8 sm:h-10 w-16 bg-white/10 animate-pulse rounded" />
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/10 animate-pulse rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
