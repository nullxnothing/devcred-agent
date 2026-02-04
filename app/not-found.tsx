'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6 py-20 relative overflow-hidden">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 text-center max-w-lg">
        {/* 404 Display */}
        <div className="mb-8">
          <div className="text-[150px] md:text-[200px] font-black font-display-mock leading-none text-border/30 select-none">
            404
          </div>
          <div className="mt-[-40px] md:mt-[-60px]">
            <h1 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">
              PAGE NOT <span className="text-accent">FOUND</span>
            </h1>
          </div>
        </div>

        <p className="text-lg text-text-muted mb-8 max-w-md mx-auto">
          Looks like this page got rugged. The dev probably dumped and ran.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/">
            <Button variant="accent" className="w-full sm:w-auto">
              <Home size={18} /> Go Home
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="secondary" className="w-full sm:w-auto">
              <Search size={18} /> View Leaderboard
            </Button>
          </Link>
        </div>

        {/* Back link */}
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-accent transition-colors"
        >
          <ArrowLeft size={16} /> Go back to previous page
        </button>
      </div>
    </div>
  );
}
