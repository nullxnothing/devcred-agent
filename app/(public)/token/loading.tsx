import { Coins } from 'lucide-react';

export default function TokenLoading() {
  return (
    <div className="min-h-screen bg-cream relative">
      {/* Subtle grid texture background */}
      <div className="absolute inset-0 grid-pattern opacity-[0.04] pointer-events-none" />

      {/* Hero skeleton */}
      <div className="px-6 md:px-12 py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-accent flex items-center justify-center border-2 border-border shadow-[4px_4px_0px_0px_var(--border)]">
              <Coins size={28} className="text-cream" />
            </div>
            <div className="h-16 w-48 bg-border/30 animate-pulse rounded" />
          </div>

          <div className="h-6 w-96 bg-border/30 animate-pulse mb-8 rounded" />

          {/* Contract address skeleton */}
          <div className="mb-8">
            <div className="h-4 w-32 bg-border/30 animate-pulse mb-2 rounded" />
            <div className="h-10 w-64 bg-border/30 animate-pulse rounded" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <section className="py-12 md:py-16 px-6 md:px-12 bg-cream border-b-2 border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-card border-2 border-border p-5"
              >
                <div className="h-4 w-20 bg-border/30 animate-pulse mb-3 rounded" />
                <div className="h-10 w-16 bg-border/30 animate-pulse mb-1 rounded" />
                <div className="h-3 w-12 bg-border/30 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funding section skeleton */}
      <section className="py-16 md:py-20 px-6 md:px-12 bg-card border-b-2 border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-border/30 animate-pulse rounded" />
            <div className="h-10 w-56 bg-border/30 animate-pulse rounded" />
          </div>
          <div className="h-5 w-96 bg-border/30 animate-pulse mb-10 rounded" />

          <div className="bg-cream border-2 border-border p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-border/30 animate-pulse rounded" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Airdrop section skeleton */}
      <section className="py-16 md:py-20 px-6 md:px-12 bg-inverted-bg border-b-2 border-inverted-bg/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-inverted-text/10 animate-pulse rounded" />
            <div className="h-10 w-32 bg-inverted-text/10 animate-pulse rounded" />
          </div>
          <div className="h-5 w-80 bg-inverted-text/10 animate-pulse mb-10 rounded" />

          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-inverted-text/10 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
