'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <div className="terminal-card p-8 max-w-md w-full">
        <div className="font-mono text-xs space-y-2 mb-6">
          <p className="text-red">&gt; ERROR: SYSTEM FAILURE</p>
          <p className="text-white-60">&gt; Something went wrong loading this page.</p>
          <p className="text-white-40">&gt; Error ID: {error.digest || 'UNKNOWN'}</p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="px-4 py-2 bg-white text-black font-mono font-bold uppercase text-xs tracking-widest border border-white hover:bg-white-90 transition-colors"
          >
            [ RETRY ]
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-transparent text-white-60 font-mono font-bold uppercase text-xs tracking-widest border border-white-20 hover:text-white hover:border-white transition-colors"
          >
            [ HOME ]
          </Link>
        </div>
      </div>
    </div>
  );
}
