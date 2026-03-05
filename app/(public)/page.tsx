import Link from 'next/link';
import { Suspense } from 'react';
import { ScanEye, Database, ShieldCheck, ArrowRight, Terminal } from 'lucide-react';
import { SearchBar } from '@/components/SearchBar';
import { ExtensionDownloadButton } from '@/components/ui/ExtensionDownloadButton';
import { TopBuildersStreaming, TopBuildersSkeleton } from '@/components/home';

export const revalidate = 60;

export default async function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-black font-mono">

      {/* ================================================================ */}
      {/* HERO — Terminal boot sequence                                    */}
      {/* ================================================================ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 border-b border-white-20 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 grid-pattern opacity-[0.03] pointer-events-none" />
        <div className="absolute inset-0 scanline-overlay pointer-events-none" />

        <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
          {/* Boot log lines */}
          <div className="mb-8 sm:mb-12 space-y-1 text-white-40 text-[10px] sm:text-xs tracking-widest uppercase text-left max-w-md mx-auto">
            <p>[SYS] Initializing threat assessment protocol...</p>
            <p>[SYS] Connecting to Solana mainnet...</p>
            <p>[SYS] Loading on-chain intelligence database...</p>
            <p className="text-white-90">[RDY] System online.<span className="animate-cursor-blink">_</span></p>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-mono font-extrabold uppercase tracking-tighter text-white leading-none mb-4 sm:mb-6">
            [BLACKLIST]
          </h1>

          {/* Tagline */}
          <p className="text-lg sm:text-xl md:text-2xl text-white-60 tracking-widest uppercase mb-10 sm:mb-14">
            We see everything.
          </p>

          {/* Search bar */}
          <div className="max-w-2xl mx-auto mb-12 sm:mb-16">
            <SearchBar />
          </div>

          {/* Demo scan result card */}
          <div className="max-w-sm mx-auto terminal-card p-4 sm:p-6 text-left">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase">Subject File #00412</span>
              <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase">2026.02.27</span>
            </div>
            <div className="border-t border-white-20 pt-3 mb-3">
              <div className="text-xs sm:text-sm text-white-60 tracking-widest uppercase mb-1">Handle</div>
              <div className="text-base sm:text-lg text-white font-extrabold uppercase">@SolanaSteve</div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <div className="text-xs text-white-40 tracking-widest uppercase mb-1">Score</div>
                <div className="text-2xl sm:text-3xl text-white font-extrabold">684</div>
              </div>
              <div>
                <div className="text-xs text-white-40 tracking-widest uppercase mb-1">Classification</div>
                <div className="text-base sm:text-lg text-white font-extrabold uppercase">CLEARED</div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-0.5 border border-white-20 text-[10px] sm:text-xs text-white-60 tracking-widest uppercase">3 Migrations</span>
              <span className="px-2 py-0.5 border border-white-20 text-[10px] sm:text-xs text-white-60 tracking-widest uppercase">0 Rugs</span>
              <span className="px-2 py-0.5 border border-white-20 text-[10px] sm:text-xs text-white-60 tracking-widest uppercase">12 Launches</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white-20 text-xs tracking-widest uppercase animate-pulse">
          Scroll to continue
        </div>
      </section>

      {/* ================================================================ */}
      {/* PROTOCOL — 3-step process                                       */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase block mb-3">// Assessment Protocol</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold uppercase tracking-tight text-white">
              PROTOCOL
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {/* Step 1: IDENTIFY */}
            <div className="terminal-card p-6 sm:p-8 group">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-white-40 text-xs tracking-widest uppercase">01</span>
                <div className="flex-1 h-px bg-white-20" />
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 border border-white-20 flex items-center justify-center mb-4 sm:mb-6">
                <ScanEye size={20} className="text-white-60 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-white mb-2 sm:mb-3">
                Identify
              </h3>
              <p className="text-sm text-white-40 leading-relaxed">
                Connect wallet. We scan your on-chain footprint.
              </p>
            </div>

            {/* Step 2: ANALYZE */}
            <div className="terminal-card p-6 sm:p-8 group">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-white-40 text-xs tracking-widest uppercase">02</span>
                <div className="flex-1 h-px bg-white-20" />
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 border border-white-20 flex items-center justify-center mb-4 sm:mb-6">
                <Database size={20} className="text-white-60 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-white mb-2 sm:mb-3">
                Analyze
              </h3>
              <p className="text-sm text-white-40 leading-relaxed">
                Token launches, migrations, holder data, rug detection.
              </p>
            </div>

            {/* Step 3: CLASSIFY */}
            <div className="terminal-card p-6 sm:p-8 group">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <span className="text-white-40 text-xs tracking-widest uppercase">03</span>
                <div className="flex-1 h-px bg-white-20" />
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 border border-white-20 flex items-center justify-center mb-4 sm:mb-6">
                <ShieldCheck size={20} className="text-white-60 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-white mb-2 sm:mb-3">
                Classify
              </h3>
              <p className="text-sm text-white-40 leading-relaxed">
                Assigned a threat level. SOVEREIGN to <span className="text-red">FLAGGED</span>.
              </p>
            </div>
          </div>

          {/* Tier reference strip */}
          <div className="mt-8 sm:mt-12 terminal-card p-4 sm:p-6">
            <div className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase mb-3">Classification Tiers</div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {['SOVEREIGN', 'CLEARED', 'OPERATIVE', 'VETTED', 'TRACKED', 'FILED'].map((tier) => (
                <span key={tier} className="px-2 sm:px-3 py-1 border border-white-20 text-[10px] sm:text-xs text-white-60 tracking-widest uppercase">
                  {tier}
                </span>
              ))}
              <span className="px-2 sm:px-3 py-1 border border-red text-[10px] sm:text-xs text-red tracking-widest uppercase">
                FLAGGED
              </span>
              <span className="px-2 sm:px-3 py-1 border border-white-20 text-[10px] sm:text-xs text-white-20 tracking-widest uppercase">
                GHOST
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* SUBJECT SEARCH — Wallet lookup                                   */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white-20 bg-black-1">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase block mb-3">// Subject Lookup</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold uppercase tracking-tight text-white mb-3 sm:mb-4">
            SUBJECT SEARCH
          </h2>
          <p className="text-sm sm:text-base text-white-40 mb-8 sm:mb-12 max-w-lg mx-auto">
            Paste any Solana wallet address. Instantly retrieve launch history, rug score, and threat classification.
          </p>

          <div className="terminal-card p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <Terminal size={14} className="text-white-40" />
              <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase">Query Interface</span>
              <div className="flex-1 h-px bg-white-20" />
            </div>
            <SearchBar />
            <p className="text-[10px] sm:text-xs text-white-20 mt-4 tracking-wider">
              Supports any Solana wallet that has created tokens on pump.fun
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* FIELD AGENT — Chrome extension                                   */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white-20">
        <div className="max-w-4xl mx-auto">
          <div className="terminal-card p-6 sm:p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase">// Deployment Briefing</span>
              <div className="flex-1 h-px bg-white-20" />
              <span className="text-[10px] sm:text-xs text-white-20 tracking-widest uppercase">Field Agent v1.0</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold uppercase tracking-tight text-white mb-3 sm:mb-4">
              FIELD AGENT
            </h2>
            <p className="text-sm sm:text-base text-white-40 mb-8 sm:mb-10 max-w-xl leading-relaxed">
              Deploy the Blacklist Chrome extension directly into your trading terminal. Threat assessments are injected into Axiom.trade in real-time. Never trade blind.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
              <div className="border border-white-20 p-4">
                <div className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase mb-2">Capability</div>
                <div className="text-sm text-white-90 font-extrabold uppercase">Inline Scores</div>
                <p className="text-xs text-white-40 mt-1">Scores appear next to every dev wallet on Axiom.</p>
              </div>
              <div className="border border-white-20 p-4">
                <div className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase mb-2">Capability</div>
                <div className="text-sm text-white-90 font-extrabold uppercase">Threat Alerts</div>
                <p className="text-xs text-white-40 mt-1">Visual warnings when a dev has previous rugs on record.</p>
              </div>
              <div className="border border-white-20 p-4">
                <div className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase mb-2">Capability</div>
                <div className="text-sm text-white-90 font-extrabold uppercase">Full Dossier</div>
                <p className="text-xs text-white-40 mt-1">Click through for complete launch history and holder data.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <ExtensionDownloadButton />
              <span className="text-[10px] sm:text-xs text-white-20 tracking-wider">Load unpacked in Chrome &middot; Works with Axiom.trade</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CLASSIFIED RANKINGS — Leaderboard preview                        */}
      {/* ================================================================ */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white-20 bg-black-1">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-12 gap-4">
            <div>
              <span className="text-[10px] sm:text-xs text-white-40 tracking-widest uppercase block mb-2">// Intelligence Database</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold uppercase tracking-tight text-white">
                CLASSIFIED RANKINGS
              </h2>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center gap-2 px-4 py-2 border border-white-20 text-xs text-white-60 tracking-widest uppercase hover:border-white-60 hover:text-white transition-colors"
            >
              View All Rankings <ArrowRight size={14} />
            </Link>
          </div>

          <Suspense fallback={<TopBuildersSkeleton />}>
            <TopBuildersStreaming />
          </Suspense>
        </div>
      </section>

      {/* ================================================================ */}
      {/* CTA — Enter the system                                           */}
      {/* ================================================================ */}
      <section className="py-20 sm:py-28 md:py-36 px-4 sm:px-6 text-center relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 grid-pattern opacity-[0.02] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-mono font-extrabold uppercase tracking-tight text-white leading-tight mb-4 sm:mb-6">
            Enter the system.<br />
            Your record starts now.
          </h2>
          <p className="text-sm sm:text-base text-white-40 mb-8 sm:mb-12 max-w-lg mx-auto">
            Every wallet tells a story. Make sure yours is worth reading.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-3 px-8 sm:px-12 py-3 sm:py-4 border border-white text-white text-sm sm:text-base tracking-widest uppercase font-extrabold hover:bg-white hover:text-black transition-colors"
          >
            Initialize Profile <ArrowRight size={18} />
          </Link>

          <div className="mt-12 sm:mt-16 text-white-20 text-[10px] sm:text-xs tracking-widest uppercase">
            [BLACKLIST] // Solana Developer Threat Assessment // {new Date().getFullYear()}
          </div>
        </div>
      </section>
    </div>
  );
}
