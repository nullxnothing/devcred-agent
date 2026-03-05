'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="absolute inset-0 grid-pattern pointer-events-none" />

      <div className="relative z-10 text-center max-w-lg">
        <div className="mb-8">
          <div className="text-[120px] md:text-[180px] font-mono font-extrabold leading-none text-white-20 select-none">
            404
          </div>
          <div className="mt-[-30px] md:mt-[-50px]">
            <h1 className="text-2xl md:text-3xl font-mono font-extrabold uppercase text-white mb-4">
              RECORD NOT FOUND
            </h1>
          </div>
        </div>

        <p className="text-sm font-mono text-white-40 mb-8 max-w-md mx-auto">
          &gt; ERROR: The requested file does not exist in our surveillance database.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="px-5 py-3 bg-white text-black font-mono font-bold uppercase text-xs tracking-widest border border-white hover:bg-white-90 transition-colors"
          >
            [ HOME ]
          </Link>
          <Link
            href="/leaderboard"
            className="px-5 py-3 bg-transparent text-white-60 font-mono font-bold uppercase text-xs tracking-widest border border-white-20 hover:text-white hover:border-white transition-colors"
          >
            [ RANKINGS ]
          </Link>
        </div>

        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-xs font-mono text-white-40 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> GO BACK
        </button>
      </div>
    </div>
  );
}
