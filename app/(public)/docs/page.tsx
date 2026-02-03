'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Trophy, Shield, Star, Zap, CheckCircle, Award,
  ArrowRight, Coins, TrendingUp, Users, Clock, AlertTriangle,
  Wallet, BarChart3, Target, Database, Globe, Code, HelpCircle,
  Copy, Check, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

function CodeBlock({ children, copyText }: { children: React.ReactNode; copyText: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="relative bg-white text-dark p-6 font-mono text-sm overflow-x-auto border-2 border-dark/30">
      <button
        onClick={handleCopy}
        className="absolute top-4 right-4 p-2 hover:bg-dark/10 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check size={16} className="text-green-400" />
        ) : (
          <Copy size={16} className="text-dark/60 hover:text-dark" />
        )}
      </button>
      {children}
    </div>
  );
}

const SECTIONS = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'scoring', label: 'Scoring System' },
  { id: 'tiers', label: 'Reputation Tiers' },
  { id: 'migration', label: 'Migrations' },
  { id: 'fizzled-vs-rugged', label: 'Fizzled vs Rugged' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'wallet-scanning', label: 'Wallet Scanning' },
  { id: 'api', label: 'API Reference' },
  { id: 'faq', label: 'FAQ' },
];

const TIERS = [
  {
    name: 'Legend',
    color: '#FFD54F',
    icon: Trophy,
    score: '720+',
    requirements: ['720+ Score', '5+ Migrations', '6+ Months'],
    description: 'The elite tier. Exceptional track record of successful launches.',
  },
  {
    name: 'Elite',
    color: '#3B3B3B',
    icon: Star,
    score: '700+',
    requirements: ['700+ Score', '3+ Migrations'],
    description: 'Highly accomplished with multiple proven launches.',
  },
  {
    name: 'Proven',
    color: '#FF6D00',
    icon: CheckCircle,
    score: 'Any',
    requirements: ['1+ Migration'],
    description: 'Successfully migrated at least one token to DEX.',
  },
  {
    name: 'Builder',
    color: '#FF9E40',
    icon: Zap,
    score: 'Any',
    requirements: ['3+ Launches'],
    description: 'Active developer with multiple token launches.',
  },
  {
    name: 'Verified',
    color: '#6B7280',
    icon: Shield,
    score: 'Any',
    requirements: ['1+ Wallet'],
    description: 'Verified ownership of developer wallet.',
  },
  {
    name: 'Unverified',
    color: '#4B5563',
    icon: Award,
    score: '0',
    requirements: ['Unclaimed'],
    description: 'Profile scanned but not yet claimed.',
  },
];

const SCORE_COMPONENTS = [
  { name: 'Migration Bonus', maxPoints: 50, icon: TrendingUp, description: 'Token migrates from pump.fun to Raydium/Orca/Meteora' },
  { name: 'ATH Market Cap', maxPoints: 30, icon: Coins, description: '+1 point per $100K market cap achieved' },
  { name: 'Holder Retention', maxPoints: 20, icon: Users, description: '+1 point per 100 current holders' },
  { name: 'Dev Behavior', maxPoints: 20, icon: Shield, description: 'Rewards devs who don\'t dump their tokens' },
  { name: 'Bundle Behavior', maxPoints: 15, icon: Target, description: '<5% bundled = full points' },
  { name: 'Longevity', maxPoints: 10, icon: Clock, description: '+1 point per week active' },
  { name: 'Community', maxPoints: 5, icon: Users, description: 'Bonus for active community presence' },
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
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-dark text-cream py-20 md:py-28 px-6 md:px-12 relative overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(#FBF0DF 1px, transparent 1px), linear-gradient(90deg, #FBF0DF 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        {/* Decorative elements */}
        <div className="absolute top-10 right-10 md:right-20 bg-accent text-cream px-4 py-2 border-2 border-dark font-bold text-sm uppercase tracking-wider transform rotate-3 hidden md:block">
          Documentation
        </div>
        <div className="absolute bottom-10 left-10 md:left-20 w-20 h-20 border-4 border-accent/20 transform -rotate-12 hidden md:block" />
        <div className="absolute top-20 left-20 text-6xl opacity-10">🚀</div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase border-2 border-accent/50 bg-dark-light rounded-full">
            <Code size={14} className="text-accent" />
            Developer Guide
          </div>
          <h1 className="text-5xl md:text-7xl xl:text-8xl font-black font-display-mock mb-6 leading-[0.9]">
            HOW <span className="text-accent">DEVKARMA</span><br />WORKS
          </h1>
          <p className="text-xl md:text-2xl text-cream/60 max-w-2xl leading-relaxed">
            The on-chain reputation system for Solana devs. Understand how we calculate scores, assign tiers, and verify launches.
          </p>
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex">
        {/* Sticky Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-64 shrink-0 border-r-2 border-dark/30 bg-white sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <nav className="p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-dark/50 mb-4">On This Page</div>
            <ul className="space-y-1">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
                      activeSection === id
                        ? 'bg-accent text-dark'
                        : 'text-dark/60 hover:text-dark hover:bg-dark/5'
                    }`}
                  >
                    <ChevronRight size={14} className={activeSection === id ? 'opacity-100' : 'opacity-0'} />
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
          <section id="quick-start" className="py-16 md:py-20 px-6 md:px-12 bg-white border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  01
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Quick Start</h2>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { step: 1, title: 'Connect Twitter', desc: 'Sign in with your Twitter account to claim your profile.' },
                  { step: 2, title: 'Verify Wallet', desc: 'Connect and sign with your dev wallet to prove ownership.' },
                  { step: 3, title: 'Get Your score calculated', desc: 'We scan your launches and calculate your DEVKARMA score.' },
                ].map((item) => (
                  <div key={item.step} className="group bg-cream border-2 border-accent/50 p-6 shadow-[6px_6px_0px_0px_#3B3B3B] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_#3B3B3B] transition-all">
                    <div className="w-12 h-12 bg-accent border-2 border-dark flex items-center justify-center mb-4 font-black text-xl text-dark group-hover:bg-accent/90 transition-colors">
                      {item.step}
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-dark">{item.title}</h3>
                    <p className="text-dark/60 text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 text-center">
                <Link href="/login">
                  <Button variant="accent" className="shadow-[4px_4px_0px_0px_#000]">
                    Claim Your Profile <ArrowRight size={18} />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Scoring System */}
          <section id="scoring" className="py-16 md:py-20 px-6 md:px-12 bg-dark border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  02
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Scoring System</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                Each token scores <strong className="text-accent">0-150 points</strong>. Your DEVKARMA (0-740) is the weighted average.
              </p>

              <div className="bg-white border-2 border-accent/50 p-6 md:p-8 shadow-[6px_6px_0px_0px_#3B3B3B]">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 size={24} className="text-accent" />
                  <h3 className="font-bold text-xl text-dark">Token Score Breakdown</h3>
                  <span className="ml-auto text-sm font-bold text-dark/50">Max 150 pts</span>
                </div>
                <div className="space-y-3">
                  {SCORE_COMPONENTS.map((component) => (
                    <div key={component.name} className="flex items-center gap-4 p-4 bg-cream border-2 border-accent/20 hover:border-accent/50 transition-colors">
                      <div className="w-10 h-10 bg-accent/20 flex items-center justify-center shrink-0">
                        <component.icon size={20} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-dark">{component.name}</span>
                        <span className="text-dark/50 text-sm ml-2 hidden sm:inline">— {component.description}</span>
                      </div>
                      <span className="text-accent font-black text-lg">+{component.maxPoints}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-red-900/30 border-2 border-red-500 p-6 flex items-start gap-4">
                <AlertTriangle size={24} className="text-red-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-red-400 mb-1">Rug Penalty</h3>
                  <p className="text-red-300">
                    Tokens flagged as rugs receive a <strong>-100 point penalty</strong>, significantly impacting your score.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tiers */}
          <section id="tiers" className="py-16 md:py-20 px-6 md:px-12 bg-white border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  03
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Reputation Tiers</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                Your tier represents overall reputation. Higher tiers need both high scores and successful launches.
              </p>

              <div className="grid gap-4">
                {TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className="group bg-cream border-2 border-dark/30 p-5 shadow-[4px_4px_0px_0px_#3B3B3B] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_#3B3B3B] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 shrink-0">
                        <div
                          className="w-14 h-14 flex items-center justify-center border-2 border-dark"
                          style={{ backgroundColor: tier.color + '25' }}
                        >
                          <tier.icon size={28} style={{ color: tier.color }} />
                        </div>
                        <div className="sm:w-24">
                          <h3 className="text-xl font-black font-display-mock" style={{ color: tier.color }}>
                            {tier.name}
                          </h3>
                          <div className="text-xs text-dark/50 font-mono">{tier.score}</div>
                        </div>
                      </div>
                      <div className="flex-1 text-sm text-dark/60">{tier.description}</div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {tier.requirements.map((req, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs font-bold uppercase border-2"
                            style={{ borderColor: tier.color, color: tier.color }}
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
          <section id="migration" className="py-16 md:py-20 px-6 md:px-12 bg-dark border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  04
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">What is a Migration?</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                When your token graduates from pump.fun&apos;s bonding curve to a major DEX with real liquidity.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-900/30 border-2 border-green-500 p-6 shadow-[4px_4px_0px_0px_#22c55e]">
                  <h3 className="font-bold text-lg mb-4 text-green-400 flex items-center gap-2">
                    <CheckCircle size={20} />
                    Counts as Migration
                  </h3>
                  <ul className="space-y-3 text-green-300">
                    {['Raydium liquidity pool', 'Orca whirlpool', 'Meteora pool', 'PumpSwap AMM', 'Jupiter routing'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle size={16} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-900/30 border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_#dc2626]">
                  <h3 className="font-bold text-lg mb-4 text-red-400 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Does NOT Count
                  </h3>
                  <ul className="space-y-3 text-red-300">
                    {['Still on pump.fun curve', 'No trading activity', 'Removed liquidity'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <AlertTriangle size={16} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Fizzled vs Rugged */}
          <section id="fizzled-vs-rugged" className="py-16 md:py-20 px-6 md:px-12 bg-white border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  05
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Fizzled ≠ Rugged</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                We distinguish tokens that didn&apos;t gain traction from tokens where devs dumped on holders.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-amber-900/30 border-2 border-amber-500 p-6 shadow-[4px_4px_0px_0px_#d97706]">
                  <div className="flex items-center gap-3 mb-4">
                    <HelpCircle size={24} className="text-amber-400" />
                    <h3 className="font-bold text-xl text-amber-400">Fizzled</h3>
                  </div>
                  <p className="text-amber-300 mb-4">
                    Didn&apos;t gain traction or failed to migrate. No malicious intent.
                  </p>
                  <ul className="space-y-2 text-amber-300 text-sm">
                    <li>• Low score, but <strong>no penalty</strong></li>
                    <li>• Dev kept tokens or sold slowly</li>
                    <li>• Common for early builders</li>
                  </ul>
                </div>
                <div className="bg-red-900/30 border-2 border-red-500 p-6 shadow-[4px_4px_0px_0px_#dc2626]">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={24} className="text-red-400" />
                    <h3 className="font-bold text-xl text-red-400">Rugged</h3>
                  </div>
                  <p className="text-red-300 mb-4">
                    Dev dumped significant supply on holders, causing price crash.
                  </p>
                  <ul className="space-y-2 text-red-300 text-sm">
                    <li>• <strong>-100 point penalty</strong> per rug</li>
                    <li>• Dev sold &gt;50% supply quickly</li>
                    <li>• Seriously damages reputation</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-5 bg-green-900/30 border-2 border-green-500 flex items-start gap-4">
                <CheckCircle size={24} className="text-green-400 shrink-0" />
                <p className="text-green-300">
                  <strong>Key Insight:</strong> A dev with 5 fizzled tokens and 2 migrations can still have an excellent score.
                  DEVKARMA rewards legitimate builders who keep trying.
                </p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section id="data-sources" className="py-16 md:py-20 px-6 md:px-12 bg-dark border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  06
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Data Sources</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                We aggregate data from multiple trusted on-chain sources.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white border-2 border-accent/50 p-6 shadow-[6px_6px_0px_0px_#3B3B3B]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent/20 flex items-center justify-center">
                      <Database size={24} className="text-accent" />
                    </div>
                    <h3 className="font-bold text-xl text-dark">Helius</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-dark/60">
                    <li>• Token discovery via DAS API</li>
                    <li>• Holder count tracking</li>
                    <li>• Transaction history analysis</li>
                    <li>• Creator wallet verification</li>
                  </ul>
                </div>
                <div className="bg-white border-2 border-accent/50 p-6 shadow-[6px_6px_0px_0px_#3B3B3B]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent/20 flex items-center justify-center">
                      <Globe size={24} className="text-accent" />
                    </div>
                    <h3 className="font-bold text-xl text-dark">DexScreener</h3>
                  </div>
                  <ul className="space-y-2 text-sm text-dark/60">
                    <li>• Migration detection (Raydium, Orca, etc.)</li>
                    <li>• Market cap & volume data</li>
                    <li>• Liquidity tracking</li>
                    <li>• Trading pair information</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Wallet Scanning */}
          <section id="wallet-scanning" className="py-16 md:py-20 px-6 md:px-12 bg-white border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  07
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Wallet Scanning</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                Search any Solana wallet to see launch history, even if unclaimed.
              </p>

              <div className="bg-cream border-2 border-accent/50 p-6 md:p-8 shadow-[6px_6px_0px_0px_#3B3B3B]">
                <div className="flex items-start gap-4">
                  <Wallet size={32} className="text-accent shrink-0" />
                  <div>
                    <h3 className="font-bold text-lg mb-4 text-dark">How It Works</h3>
                    <ol className="space-y-3 text-dark/60">
                      <li className="flex gap-3">
                        <span className="w-6 h-6 bg-accent text-dark flex items-center justify-center text-xs font-bold shrink-0">1</span>
                        Enter any Solana wallet address in the search bar
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 bg-accent text-dark flex items-center justify-center text-xs font-bold shrink-0">2</span>
                        We scan on-chain data for tokens created by that wallet
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 bg-accent text-dark flex items-center justify-center text-xs font-bold shrink-0">3</span>
                        A profile is automatically generated with launch history
                      </li>
                      <li className="flex gap-3">
                        <span className="w-6 h-6 bg-accent text-dark flex items-center justify-center text-xs font-bold shrink-0">4</span>
                        Developer can later claim and verify ownership
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-accent/20 border-2 border-accent">
                <p className="text-sm text-dark">
                  <strong>Note:</strong> Unclaimed profiles show as &quot;Unverified&quot; until the developer signs in and verifies wallet ownership.
                </p>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section id="api" className="py-16 md:py-20 px-6 md:px-12 bg-dark border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  08
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">API Reference</h2>
              </div>
              <p className="text-dark/60 mb-10 text-lg ml-[4.5rem]">
                Public endpoints for integrating DEVKARMA data into your app.
              </p>

              <div className="space-y-4">
                <CodeBlock copyText="GET /api/profile/{handle}">
                  <div className="text-accent mb-2"># Get profile by Twitter handle or wallet</div>
                  <div className="text-dark/90">GET /api/profile/&#123;handle&#125;</div>
                </CodeBlock>

                <CodeBlock copyText="GET /api/leaderboard?limit=50">
                  <div className="text-accent mb-2"># Get leaderboard</div>
                  <div className="text-dark/90">GET /api/leaderboard?limit=50</div>
                </CodeBlock>

                <CodeBlock copyText="GET /api/search?q={query}">
                  <div className="text-accent mb-2"># Search wallets/handles</div>
                  <div className="text-dark/90">GET /api/search?q=&#123;query&#125;</div>
                </CodeBlock>

                <CodeBlock copyText="GET /api/token/lookup?mint={mintAddress}">
                  <div className="text-accent mb-2"># Look up token by mint</div>
                  <div className="text-dark/90">GET /api/token/lookup?mint=&#123;mintAddress&#125;</div>
                </CodeBlock>
              </div>

              <div className="mt-6 p-4 bg-accent/20 border-2 border-accent flex items-start gap-3">
                <Code size={20} className="text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-dark">
                  <strong>Rate Limits:</strong> Endpoints are rate-limited. For high-volume access, reach out on Twitter for API key.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-16 md:py-20 px-6 md:px-12 bg-white border-b-2 border-dark/30">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-accent text-dark flex items-center justify-center font-black text-2xl font-display-mock border-2 border-dark">
                  09
                </div>
                <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">FAQ</h2>
              </div>

              <div className="space-y-4">
                {[
                  { q: 'How often is my score updated?', a: 'Your score is recalculated each time your profile is viewed. Market data and holder counts are fetched in real-time.' },
                  { q: 'Can I dispute my score?', a: 'Scores are calculated entirely from on-chain data. If you believe there\'s an error, reach out on Twitter.' },
                  { q: 'How do I improve my score?', a: 'Launch quality tokens that migrate, maintain holder retention, don\'t dump your supply, keep low bundle percentages.' },
                  { q: 'What if I have multiple wallets?', a: 'You can verify multiple wallets on your profile. All tokens from verified wallets contribute to your score.' },
                  { q: 'Is my data private?', a: 'All data is derived from public on-chain transactions. We don\'t access any private wallet data.' },
                ].map((item, idx) => (
                  <div key={idx} className="border-2 border-dark/30 p-5 bg-dark shadow-[4px_4px_0px_0px_#3B3B3B]">
                    <h3 className="font-bold text-lg mb-2 text-dark">{item.q}</h3>
                    <p className="text-dark/60">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 md:py-28 px-6 md:px-12 bg-dark text-cream text-center relative overflow-x-clip">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-20 left-20 text-8xl opacity-10">🚀</div>
            <div className="absolute bottom-20 right-20 text-6xl opacity-10">⭐</div>

            <div className="max-w-2xl mx-auto relative z-10">
              <h2 className="text-4xl md:text-6xl font-black font-display-mock mb-6 leading-tight">
                READY TO BUILD<br />YOUR <span className="text-accent">REPUTATION</span>?
              </h2>
              <p className="text-xl text-cream/70 mb-10">
                Claim your profile and let your launches speak for themselves.
              </p>
              <Link href="/login" className="inline-block no-underline">
                <Button variant="accent" className="text-lg px-10 py-4 h-auto shadow-[8px_8px_0px_0px_#000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px]">
                  Claim Your Profile <ArrowRight size={20} />
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

