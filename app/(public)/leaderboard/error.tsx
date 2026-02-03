'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function LeaderboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Leaderboard error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-5xl font-display-mock text-dark mb-4">LOAD FAILED</h1>
        <p className="text-lg text-dark/70 mb-6">
          Could not load the leaderboard. Please try again.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-dark text-cream font-bold uppercase text-sm tracking-wider border-2 border-dark hover:bg-accent hover:border-accent transition-colors"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-cream text-dark font-bold uppercase text-sm tracking-wider border-2 border-dark hover:bg-dark/5 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
