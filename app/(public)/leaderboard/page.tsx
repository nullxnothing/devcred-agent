import Link from 'next/link';
import { ExternalLink, BadgeCheck } from 'lucide-react';

import { getLeaderboardData, LeaderboardEntry } from '@/lib/data-fetching';

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

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-6 md:px-12 py-16 md:py-24 border-b-2 border-dark">
        <h1 className="text-6xl md:text-9xl font-black font-display-mock text-dark mb-4">
          TOP <span className="text-accent">DEVS</span>
        </h1>
        <p className="text-xl md:text-2xl max-w-2xl font-medium leading-relaxed">
          Ranking the most successful developers based on launch history, security, and community trust.
        </p>
        <p className="mt-4 text-sm text-dark/60">
          Note: Developers appear on the leaderboard after verifying at least one wallet.
        </p>
      </div>

      {/* Table */}
      <div className="w-full">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 md:px-12 py-6 border-b-2 border-dark text-xs font-bold uppercase tracking-widest text-dark/60">
          <div className="col-span-1">Rank</div>
          <div className="col-span-4">Developer</div>
          <div className="col-span-3">Tier</div>
          <div className="col-span-2 text-right">Status</div>
          <div className="col-span-2 text-right">Score</div>
        </div>

        {/* Rows */}
        {leaderboard.map((dev) => (
          <Link
            key={dev.id}
            href={`/profile/${encodeURIComponent(dev.twitterHandle)}`}
            className="group relative grid grid-cols-1 md:grid-cols-12 gap-4 px-6 md:px-12 py-8 md:py-6 border-b-2 border-dark items-center hover:bg-white transition-colors cursor-pointer"
          >
            {/* Mobile Rank Badge */}
            <div className="md:hidden absolute top-6 right-6 font-black text-4xl text-black/5 font-display-mock">
              #{dev.rank}
            </div>

            <div className="col-span-1 hidden md:block text-xl font-bold font-display-mock">
              #{dev.rank}
            </div>

            <div className="col-span-12 md:col-span-4 flex items-center gap-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dev.avatarUrl || '/default-avatar.png'}
                  alt={dev.twitterName}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-none border-2 border-dark object-cover bg-gray-200"
                />
                {dev.isVerified && (
                  <div className="absolute -top-2 -right-2 bg-accent text-dark border-2 border-dark p-0.5">
                    <BadgeCheck size={14} strokeWidth={3} />
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-lg md:text-xl leading-none mb-1 group-hover:text-accent transition-colors flex items-center gap-2">
                  {dev.twitterName}
                  <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-sm font-mono opacity-60">@{dev.twitterHandle}</div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-3 flex flex-wrap gap-2 mt-2 md:mt-0">
              <span
                className="px-2 py-1 text-xs font-bold uppercase border bg-transparent"
                style={{ borderColor: dev.tierColor, color: dev.tierColor }}
              >
                {dev.tierName}
              </span>
            </div>

            <div className="col-span-6 md:col-span-2 flex flex-col md:items-end mt-4 md:mt-0">
              <span className="md:hidden text-xs uppercase font-bold text-dark/50 mb-1">Status</span>
              <span className="font-bold text-sm">
                {dev.isVerified ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-gray-500">Unverified</span>
                )}
              </span>
            </div>

            <div className="col-span-6 md:col-span-2 flex flex-col items-end mt-4 md:mt-0">
              <span className="md:hidden text-xs uppercase font-bold text-dark/50 mb-1">Dev Score</span>
              <span
                className={`font-black text-2xl md:text-3xl font-display-mock ${
                  dev.score > 500 ? 'text-dark' : 'text-dark/60'
                }`}
              >
                {dev.score}
              </span>
            </div>
          </Link>
        ))}

        {leaderboard.length === 0 && (
          <div className="p-24 text-center">
            <h3 className="text-2xl font-bold mb-4">No developers on the leaderboard yet</h3>
            <p className="opacity-60 mb-4">Developers appear here after connecting a wallet to their profile.</p>
            <p className="text-sm opacity-40">Tip: Search for any Solana wallet address to scan a dev&apos;s launch history!</p>
          </div>
        )}
      </div>
    </div>
  );
}
