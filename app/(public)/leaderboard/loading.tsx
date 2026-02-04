import { Trophy } from 'lucide-react';

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen pb-20 bg-cream relative">
      {/* Subtle grid texture background */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />

      {/* Header */}
      <div className="px-6 md:px-12 py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden z-10">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-accent flex items-center justify-center border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
              <Trophy size={28} className="text-cream" />
            </div>
            <h1 className="text-5xl md:text-8xl font-black font-display-mock text-dark">
              TOP <span className="text-accent">BUILDERS</span>
            </h1>
          </div>
          <p className="text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-text-muted mb-8">
            Ranking the most successful developers based on launch history, security, and community trust.
          </p>

          {/* Stats bar skeleton */}
          <div className="flex flex-wrap gap-6 md:gap-10">
            <div className="h-5 w-32 bg-border/30 animate-pulse rounded" />
            <div className="h-5 w-28 bg-border/30 animate-pulse rounded" />
            <div className="h-5 w-24 bg-border/30 animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Top 3 Section skeleton */}
      <div className="px-4 md:px-12 py-8 md:py-12 bg-cream border-b-2 border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-6">
            <Trophy size={20} className="text-accent" />
            <div className="h-4 w-16 bg-border/30 animate-pulse rounded" />
          </div>
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, idx) => (
              <div
                key={idx}
                className="bg-card border-2 border-border p-4 md:p-6 flex items-center gap-4 md:gap-6 shadow-[4px_4px_0px_0px_var(--border)]"
              >
                {/* Rank */}
                <div className={`w-12 h-12 ${idx === 0 ? 'bg-medal-gold/30' : idx === 1 ? 'bg-medal-silver/30' : 'bg-medal-bronze/30'} animate-pulse`} />
                {/* Avatar */}
                <div className="w-14 h-14 bg-border/30 animate-pulse rounded-full" />
                {/* Info */}
                <div className="flex-1">
                  <div className="h-6 w-40 bg-border/30 animate-pulse mb-2 rounded" />
                  <div className="h-4 w-24 bg-border/30 animate-pulse rounded" />
                </div>
                {/* Score */}
                <div className="h-10 w-20 bg-border/30 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="w-full">
        <div className="px-6 md:px-12 py-4 bg-card border-b border-border">
          <div className="h-4 w-40 bg-border/30 animate-pulse rounded" />
        </div>

        {/* Table Header */}
        <div className="hidden md:grid grid-cols-12 gap-3 px-6 md:px-12 py-4 bg-cream border-b border-border text-xs font-bold uppercase tracking-widest text-text-muted sticky top-[73px] z-30">
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Developer</div>
          <div className="col-span-4">Progress</div>
          <div className="col-span-2 text-right">Score</div>
        </div>

        {/* Rows skeleton */}
        {[...Array(10)].map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-12 gap-3 px-6 md:px-12 py-4 border-b border-border items-center"
          >
            <div className="col-span-1">
              <div className="h-6 w-8 bg-border/30 animate-pulse rounded" />
            </div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="w-10 h-10 bg-border/30 animate-pulse rounded-full" />
              <div>
                <div className="h-5 w-32 bg-border/30 animate-pulse mb-1 rounded" />
                <div className="h-3 w-20 bg-border/30 animate-pulse rounded" />
              </div>
            </div>
            <div className="col-span-4">
              <div className="h-3 w-full bg-border/30 animate-pulse rounded-full" />
            </div>
            <div className="col-span-2 flex justify-end">
              <div className="h-8 w-14 bg-border/30 animate-pulse rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
