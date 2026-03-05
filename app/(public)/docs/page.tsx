'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Copy, Check, ChevronRight
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

function CodeBlock({ children, copyText }: { children: React.ReactNode; copyText: string }) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative bg-black-2 text-white p-4 sm:p-6 font-mono text-xs sm:text-sm overflow-x-auto border border-white-20">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-white/10 active:bg-white/20 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check size={14} className="text-white sm:w-4 sm:h-4" />
        ) : (
          <Copy size={14} className="text-white-40 hover:text-white sm:w-4 sm:h-4" />
        )}
      </button>
      {children}
    </div>
  );
}

const SECTIONS = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'extension', label: 'Chrome Extension' },
  { id: 'scoring', label: 'Scoring System' },
  { id: 'tiers', label: 'Classification Tiers' },
  { id: 'migration', label: 'Migrations' },
  { id: 'fizzled-vs-rugged', label: 'Fizzled vs Rugged' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'api', label: 'API Reference' },
  { id: 'faq', label: 'FAQ' },
];

const TIERS = [
  {
    name: 'SOVEREIGN',
    score: '700+',
    requirements: ['700+ Score', '5+ Migrations', '6+ Months'],
    description: 'Apex clearance. Exceptional operational track record across multiple successful deployments.',
  },
  {
    name: 'CLEARED',
    score: '600+',
    requirements: ['600+ Score', '3+ Migrations'],
    description: 'High-clearance operative with multiple proven launches.',
  },
  {
    name: 'OPERATIVE',
    score: '500+',
    requirements: ['500+ Score', '$500K+ ATH'],
    description: 'Exceptional single deployment with significant market impact.',
  },
  {
    name: 'VETTED',
    score: '450+',
    requirements: ['450+ Score', '1+ Migration'],
    description: 'Successfully migrated at least one token to DEX.',
  },
  {
    name: 'TRACKED',
    score: '300+',
    requirements: ['300+ Score', '3+ Launches'],
    description: 'Active subject with multiple token deployments under surveillance.',
  },
  {
    name: 'FILED',
    score: '150+',
    requirements: ['150+ Score'],
    description: 'Documented subject with verified launch history.',
  },
  {
    name: 'FLAGGED',
    score: '<150',
    requirements: ['Rug Detected'],
    description: 'Subject flagged for malicious activity. Reputation compromised.',
  },
  {
    name: 'GHOST',
    score: '0',
    requirements: ['No Data'],
    description: 'Unknown subject. No operational history on file.',
  },
];

const TOKEN_SCORE_COMPONENTS = [
  { name: 'Migration', maxPoints: 30, description: 'Token migrates from pump.fun to DEX' },
  { name: 'Traction (ATH)', maxPoints: 25, description: 'Market cap achieved ($10K to $10M+)' },
  { name: 'Holder Retention', maxPoints: 20, description: 'Current holder count (50 to 5000+)' },
  { name: 'Dev Behavior', maxPoints: 15, description: 'How much dev holds (less is better)' },
  { name: 'Longevity', maxPoints: 10, description: 'Token age (1 day to 3+ months)' },
];

const DEV_SCORE_BONUSES = [
  { name: 'First Migration', points: 150, description: 'Major bonus for first successful migration' },
  { name: 'Additional Migrations', points: 75, description: 'Each migration after the first' },
  { name: '$100K Market Cap', points: 50, description: 'Bonus per token hitting $100K' },
  { name: '$500K Market Cap', points: 75, description: 'Bonus per token hitting $500K' },
  { name: '$1M Market Cap', points: 100, description: 'Bonus per token hitting $1M+' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('quick-start');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0% -70% 0%' }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-black font-mono">
      {/* Hero */}
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b border-white-20 bg-black-1 relative overflow-hidden">
        {/* Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 3px)',
        }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="mb-3 sm:mb-4">
            <div className="text-white-40 text-xs tracking-widest mb-2">$ man blacklist</div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-mono font-extrabold uppercase text-white leading-tight">
              SYSTEM <span className="text-white-60">MANUAL</span>
            </h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed text-white-40">
            On-chain intelligence system for Solana token creators. Classification protocols, scoring algorithms, and operational documentation.
          </p>
        </div>
      </div>

      {/* Mobile TOC */}
      <div className="xl:hidden px-4 sm:px-6 py-4 bg-black-1 border-b border-white-20 overflow-x-auto mobile-scroll-hidden">
        <div className="flex gap-2 min-w-max">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`px-3 py-1.5 text-xs sm:text-sm font-mono whitespace-nowrap border transition-colors ${
                activeSection === id
                  ? 'bg-white text-black border-white'
                  : 'text-white-40 border-white-20 hover:border-white-40 active:bg-white/10'
              }`}
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Sticky Sidebar */}
        <aside className="hidden xl:block w-64 shrink-0 border-r border-white-20 bg-black-1 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-white-20 mb-4 font-mono">// INDEX</div>
            <ul className="space-y-1">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-mono transition-colors border-l ${
                      activeSection === id
                        ? 'bg-white/10 text-white border-white'
                        : 'text-white-40 hover:text-white hover:bg-white/5 border-transparent'
                    }`}
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {/* Quick Start */}
          <section id="quick-start" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black-1 border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-3 sm:mb-4">Quick Start</h2>
              <p className="text-white-40 mb-6 sm:mb-10 text-sm sm:text-base">Initialize your Blacklist profile in three steps.</p>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { step: 1, title: 'Connect Wallet', desc: 'Sign in with your Solana wallet. Sign a message to prove ownership - no transaction needed.' },
                  { step: 2, title: 'Get Classified', desc: 'We scan your on-chain launch history and calculate your Blacklist score automatically.' },
                  { step: 3, title: 'Link X (Optional)', desc: 'Connect your X account to display your profile pic and handle in the extension.' },
                ].map((item) => (
                  <div key={item.step} className="group bg-black-2 border border-white-20 p-4 sm:p-6 hover:border-white-40 transition-colors">
                    <div className="text-white-40 text-xs font-mono mb-3 sm:mb-4">[ STEP_{item.step} ]</div>
                    <h3 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2 text-white font-mono">{item.title}</h3>
                    <p className="text-white-40 text-xs sm:text-sm font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
                <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold uppercase text-sm border border-white hover:bg-white-90 transition-colors font-mono">
                  REGISTER IDENTITY <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>

          {/* Chrome Extension */}
          <section id="extension" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">Chrome Extension</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">See subject classification scores directly on Axiom.trade while you trade.</p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-black-2 border border-white-20 p-6">
                  <div className="text-white-40 text-xs font-mono mb-4">// CAPABILITIES</div>
                  <h3 className="font-bold text-xl text-white mb-3 font-mono">What It Does</h3>
                  <ul className="space-y-2 text-white-60 text-sm font-mono">
                    <li className="flex items-start gap-2">
                      <span className="text-white-40 shrink-0">[+]</span>
                      Shows Blacklist classification badge on token pages
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white-40 shrink-0">[+]</span>
                      Displays subject&apos;s X profile if linked
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white-40 shrink-0">[+]</span>
                      Monochrome threat indicator
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-white-40 shrink-0">[+]</span>
                      Shows migration count and rug history
                    </li>
                  </ul>
                </div>

                <div className="bg-black-2 border border-white-20 p-6">
                  <div className="text-white-40 text-xs font-mono mb-4">// CLASSIFICATION</div>
                  <h3 className="font-bold text-xl text-white mb-3 font-mono">Badge Levels</h3>
                  <div className="space-y-3 font-mono text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-white">[&#9608;]</span>
                      <span className="text-white-60">CLEARED / SOVEREIGN (600+)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white-60">[&#9608;]</span>
                      <span className="text-white-60">VETTED / TRACKED (300-599)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white-40">[&#9608;]</span>
                      <span className="text-white-60">FILED (150-299)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-red">[&#9608;]</span>
                      <span className="text-white-60">FLAGGED (rugs detected)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white-20">[&#9608;]</span>
                      <span className="text-white-60">GHOST (0 score)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-white-40 bg-black-2 p-6">
                <h4 className="font-bold text-white mb-2 font-mono">// INSTALLATION</h4>
                <ol className="text-white-60 text-sm space-y-2 font-mono">
                  <li>1. Go to <code className="bg-black px-2 py-0.5 text-white">chrome://extensions</code></li>
                  <li>2. Enable &quot;Developer mode&quot; (top right)</li>
                  <li>3. Click &quot;Load unpacked&quot; and select the extension folder</li>
                  <li>4. Navigate to axiom.trade to see it in action</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Scoring System */}
          <section id="scoring" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black-1 border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">Scoring System</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                Each token scores <strong className="text-white">0-100 points</strong>. Your Blacklist score (0-740) combines token scores + migration bonuses.
              </p>

              {/* Token Score */}
              <div className="border border-white-20 bg-black-2 p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-white-40 font-mono text-xs">// TOKEN_SCORE</span>
                  <span className="ml-auto text-sm font-bold text-white-40 font-mono">Max 100 pts</span>
                </div>
                <div className="space-y-3">
                  {TOKEN_SCORE_COMPONENTS.map((component) => (
                    <div key={component.name} className="flex items-center gap-4 p-4 bg-black border border-white-20 hover:border-white-40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white font-mono">{component.name}</span>
                        <span className="text-white-40 text-sm ml-2 hidden sm:inline font-mono">-- {component.description}</span>
                      </div>
                      <span className="text-white font-bold text-lg font-mono">+{component.maxPoints}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dev Score Bonuses */}
              <div className="border border-white-40 bg-black-2 p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-white-40 font-mono text-xs">// MIGRATION_BONUSES</span>
                </div>
                <div className="space-y-3">
                  {DEV_SCORE_BONUSES.map((bonus) => (
                    <div key={bonus.name} className="flex items-center gap-4 p-4 bg-black border border-white-20 hover:border-white-40 transition-colors">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-white font-mono">{bonus.name}</span>
                        <span className="text-white-40 text-sm ml-2 hidden sm:inline font-mono">-- {bonus.description}</span>
                      </div>
                      <span className="text-white font-bold text-lg font-mono">+{bonus.points}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border border-red bg-black-2 p-6 flex items-start gap-4">
                <span className="text-red font-mono text-lg shrink-0">[!]</span>
                <div className="font-mono">
                  <h3 className="font-bold text-lg text-red mb-1">RUG PENALTY</h3>
                  <p className="text-white-60 text-sm">
                    Tokens flagged as rugs receive a <strong className="text-red">-150 point penalty</strong> to your score. Multiple rugs stack.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tiers */}
          <section id="tiers" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">Classification Tiers</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                Your classification represents operational standing. Higher tiers require both high scores and successful launches.
              </p>

              <div className="grid gap-3">
                {TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className={`group border p-5 hover:border-white-40 transition-colors bg-black-1 ${
                      tier.name === 'FLAGGED' ? 'border-red' : 'border-white-20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="sm:w-32">
                          <h3 className={`text-lg font-bold font-mono ${tier.name === 'FLAGGED' ? 'text-red' : 'text-white'}`}>
                            {tier.name}
                          </h3>
                          <div className="text-xs text-white-40 font-mono">{tier.score} pts</div>
                        </div>
                      </div>
                      <div className="flex-1 text-sm text-white-40 font-mono">{tier.description}</div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {tier.requirements.map((req, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs font-bold uppercase border font-mono ${
                              tier.name === 'FLAGGED'
                                ? 'border-red text-red'
                                : 'border-white-20 text-white-60'
                            }`}
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* What Counts as Migration */}
          <section id="migration" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black-1 border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">What is a Migration?</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                When your token graduates from pump.fun&apos;s bonding curve to a major DEX with real liquidity.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-white-40 bg-black-2 p-6">
                  <h3 className="font-bold text-lg mb-4 text-white flex items-center gap-2 font-mono">
                    <span className="text-white-40">[+]</span>
                    Counts as Migration
                  </h3>
                  <ul className="space-y-3 text-white-60 font-mono text-sm">
                    {['Raydium liquidity pool', 'Orca whirlpool', 'Meteora pool', 'PumpSwap AMM', 'Jupiter routing'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-white-40" /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border border-red bg-black-2 p-6">
                  <h3 className="font-bold text-lg mb-4 text-red flex items-center gap-2 font-mono">
                    <span>[!]</span>
                    Does NOT Count
                  </h3>
                  <ul className="space-y-3 text-white-60 font-mono text-sm">
                    {['Still on pump.fun curve', 'No trading activity', 'Removed liquidity'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <span className="text-red">x</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Fizzled vs Rugged */}
          <section id="fizzled-vs-rugged" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">Fizzled vs Rugged</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                We distinguish tokens that didn&apos;t gain traction from tokens where subjects dumped on holders.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-white-40 bg-black-2 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-white-40 font-mono">[?]</span>
                    <h3 className="font-bold text-xl text-white-60 font-mono">Fizzled</h3>
                  </div>
                  <p className="text-white-40 mb-4 font-mono text-sm">
                    Didn&apos;t gain traction or failed to migrate. No malicious intent.
                  </p>
                  <ul className="space-y-2 text-white-60 text-sm font-mono">
                    <li>- Low score, but <strong className="text-white">no penalty</strong></li>
                    <li>- Subject kept tokens or sold slowly</li>
                    <li>- Common for early operatives</li>
                  </ul>
                </div>
                <div className="border border-red bg-black-2 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-red font-mono">[!]</span>
                    <h3 className="font-bold text-xl text-red font-mono">Rugged</h3>
                  </div>
                  <p className="text-white-60 mb-4 font-mono text-sm">
                    Subject dumped significant supply on holders, causing price crash.
                  </p>
                  <ul className="space-y-2 text-white-60 text-sm font-mono">
                    <li>- <strong className="text-red">-150 point penalty</strong> per rug</li>
                    <li>- Subject sold &gt;50% supply quickly</li>
                    <li>- Seriously compromises classification</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-5 border border-white-40 bg-black-2 flex items-start gap-4">
                <span className="text-white-40 font-mono shrink-0">[i]</span>
                <p className="text-white-60 font-mono text-sm">
                  <strong className="text-white">Key Insight:</strong> A subject with 5 fizzled tokens and 2 migrations can still have an excellent score.
                  Blacklist rewards legitimate builders who keep trying.
                </p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section id="data-sources" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black-1 border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">Data Sources</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                Intelligence aggregated from multiple on-chain sources.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="border border-white-20 bg-black-2 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-white-40 font-mono text-xs">//</span>
                    <h3 className="font-bold text-xl text-white font-mono">Helius</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-white-40 font-mono">
                    <li>- Token discovery via DAS API</li>
                    <li>- Holder count tracking</li>
                    <li>- Transaction history analysis</li>
                    <li>- Creator wallet verification</li>
                  </ul>
                </div>
                <div className="border border-white-20 bg-black-2 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-white-40 font-mono text-xs">//</span>
                    <h3 className="font-bold text-xl text-white font-mono">DexScreener</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-white-40 font-mono">
                    <li>- Migration detection (Raydium, Orca, etc.)</li>
                    <li>- Market cap & volume data</li>
                    <li>- Liquidity tracking</li>
                    <li>- Trading pair information</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section id="api" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-4">API Reference</h2>
              <p className="text-white-40 mb-10 text-sm sm:text-base">
                Public endpoints for integrating Blacklist data into your app or extension.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-white mb-2 uppercase tracking-wider font-mono">Reputation (Recommended)</div>
                  <CodeBlock copyText="GET https://blacklist.fun/api/reputation/{walletAddress}">
                    <div className="text-white-40 mb-2"># Get subject classification by wallet address</div>
                    <div className="text-white">GET /api/reputation/&#123;walletAddress&#125;</div>
                    <div className="text-white-40 mt-3 text-xs">
                      Returns: score, tier, tierName, tokenCount, rugCount, migrationCount, twitterHandle, avatarUrl
                    </div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-white-40 mb-2 uppercase tracking-wider font-mono">Profile</div>
                  <CodeBlock copyText="GET /api/profile/{handle}">
                    <div className="text-white-40 mb-2"># Get full dossier by handle or wallet</div>
                    <div className="text-white">GET /api/profile/&#123;handle&#125;</div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-white-40 mb-2 uppercase tracking-wider font-mono">Rankings</div>
                  <CodeBlock copyText="GET /api/leaderboard?limit=50">
                    <div className="text-white-40 mb-2"># Get classified rankings</div>
                    <div className="text-white">GET /api/leaderboard?limit=50</div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-white-40 mb-2 uppercase tracking-wider font-mono">Token Lookup</div>
                  <CodeBlock copyText="GET /api/token/lookup?mint={mintAddress}">
                    <div className="text-white-40 mb-2"># Look up token by mint address</div>
                    <div className="text-white">GET /api/token/lookup?mint=&#123;mintAddress&#125;</div>
                  </CodeBlock>
                </div>
              </div>

              <div className="mt-6 p-4 border border-white-40 bg-black-2 flex items-start gap-3">
                <span className="text-white-40 font-mono shrink-0 mt-0.5">[i]</span>
                <p className="text-sm text-white-60 font-mono">
                  <strong className="text-white">Rate Limits:</strong> Public endpoints are rate-limited. For high-volume access, reach out on X @blackaboratorio.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-black-1 border-b border-white-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white mb-10">FAQ</h2>

              <div className="space-y-3">
                {[
                  { q: 'How do I register my identity?', a: 'Connect your Solana wallet and sign a message to prove ownership. No transaction or fees required. Your profile is created instantly.' },
                  { q: 'How do I link my X account?', a: 'After connecting your wallet, go to your profile page and click "Connect X Account" in the account settings section. This lets the extension show your X profile pic.' },
                  { q: 'What if I have multiple wallets?', a: 'You can add multiple wallets to your profile. Click "Add Wallet" on your profile page and verify each one. All tokens from verified wallets contribute to your score.' },
                  { q: 'How often is my score updated?', a: 'Your score is recalculated when your profile is viewed. Market data and holder counts are fetched in real-time from on-chain sources.' },
                  { q: 'How do I improve my score?', a: 'Launch quality tokens that migrate to DEX, maintain holder retention, don\'t dump your supply. Each successful migration gives significant bonus points.' },
                  { q: 'Can I dispute my score?', a: 'Scores are calculated entirely from on-chain data. If you believe there\'s an error, reach out on X @blackaboratorio.' },
                  { q: 'Is the extension safe?', a: 'Yes. The extension only reads data from Axiom pages and our API. It never requests wallet permissions or transaction signing.' },
                  { q: 'Why doesn\'t my X show in the extension?', a: 'Make sure you\'ve linked your X account on blacklist.fun. Only real X accounts (not auto-generated handles) are displayed.' },
                ].map((item, idx) => (
                  <div key={idx} className="border border-white-20 p-5 bg-black-2 hover:border-white-40 transition-colors">
                    <h3 className="font-bold text-base sm:text-lg mb-2 text-white font-mono">{item.q}</h3>
                    <p className="text-white-40 text-sm font-mono">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24 px-6 md:px-12 bg-black text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 3px)',
            }} />

            <div className="max-w-2xl mx-auto relative z-10">
              <div className="text-white-40 text-xs tracking-widest mb-4 font-mono">$ blacklist --register</div>
              <h2 className="text-3xl md:text-5xl font-mono font-extrabold uppercase mb-6 leading-tight">
                ESTABLISH YOUR <span className="text-white-60">RECORD</span>
              </h2>
              <p className="text-base sm:text-lg text-white-40 mb-8 font-mono">
                Register your identity and let your launches speak for themselves.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-bold uppercase text-base border border-white hover:bg-white-90 transition-colors font-mono">
                GET STARTED <ArrowRight size={20} />
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
