'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  Trophy, Shield, Star, Zap, CheckCircle, Award,
  ArrowRight, Coins, TrendingUp, Users, Clock, AlertTriangle,
  Wallet, BarChart3, Target, Database, Globe, Code, HelpCircle,
  Copy, Check, ChevronRight, Chrome, Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
    <div className="relative bg-inverted-bg text-inverted-text p-4 sm:p-6 font-mono text-xs sm:text-sm overflow-x-auto border-2 border-inverted-bg/50 rounded-sm">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 hover:bg-cream/10 active:bg-cream/20 transition-colors rounded"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check size={14} className="text-success sm:w-4 sm:h-4" />
        ) : (
          <Copy size={14} className="text-inverted-muted hover:text-inverted-text sm:w-4 sm:h-4" />
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
  { id: 'tiers', label: 'Reputation Tiers' },
  { id: 'migration', label: 'Migrations' },
  { id: 'fizzled-vs-rugged', label: 'Fizzled vs Rugged' },
  { id: 'data-sources', label: 'Data Sources' },
  { id: 'api', label: 'API Reference' },
  { id: 'faq', label: 'FAQ' },
];

const TIERS = [
  {
    name: 'Legend',
    colorClass: 'text-score-legend',
    bgClass: 'bg-score-legend/20',
    borderClass: 'border-score-legend/50',
    icon: Trophy,
    score: '700+',
    requirements: ['700+ Score', '5+ Migrations', '6+ Months'],
    description: 'The elite tier. Exceptional track record of successful launches.',
  },
  {
    name: 'Elite',
    colorClass: 'text-score-elite',
    bgClass: 'bg-score-elite/20',
    borderClass: 'border-score-elite/50',
    icon: Star,
    score: '600+',
    requirements: ['600+ Score', '3+ Migrations'],
    description: 'Highly accomplished with multiple proven launches.',
  },
  {
    name: 'Rising Star',
    colorClass: 'text-score-rising',
    bgClass: 'bg-score-rising/20',
    borderClass: 'border-score-rising/50',
    icon: TrendingUp,
    score: '500+',
    requirements: ['500+ Score', '$500K+ ATH'],
    description: 'Exceptional single launch with major market cap.',
  },
  {
    name: 'Proven',
    colorClass: 'text-score-proven',
    bgClass: 'bg-score-proven/20',
    borderClass: 'border-score-proven/50',
    icon: CheckCircle,
    score: '450+',
    requirements: ['450+ Score', '1+ Migration'],
    description: 'Successfully migrated at least one token to DEX.',
  },
  {
    name: 'Builder',
    colorClass: 'text-score-builder',
    bgClass: 'bg-score-builder/20',
    borderClass: 'border-score-builder/50',
    icon: Zap,
    score: '300+',
    requirements: ['300+ Score', '3+ Launches'],
    description: 'Active developer with multiple token launches.',
  },
  {
    name: 'Verified',
    colorClass: 'text-score-verified',
    bgClass: 'bg-score-verified/20',
    borderClass: 'border-score-verified/50',
    icon: Shield,
    score: '150+',
    requirements: ['150+ Score'],
    description: 'Verified developer with launch history.',
  },
  {
    name: 'New',
    colorClass: 'text-score-unverified',
    bgClass: 'bg-score-unverified/20',
    borderClass: 'border-score-unverified/50',
    icon: Award,
    score: '0',
    requirements: ['New Developer'],
    description: 'Profile scanned but not yet established.',
  },
];

const TOKEN_SCORE_COMPONENTS = [
  { name: 'Migration', maxPoints: 30, icon: TrendingUp, description: 'Token migrates from pump.fun to DEX' },
  { name: 'Traction (ATH)', maxPoints: 25, icon: Coins, description: 'Market cap achieved ($10K to $10M+)' },
  { name: 'Holder Retention', maxPoints: 20, icon: Users, description: 'Current holder count (50 to 5000+)' },
  { name: 'Dev Behavior', maxPoints: 15, icon: Shield, description: 'How much dev holds (less is better)' },
  { name: 'Longevity', maxPoints: 10, icon: Clock, description: 'Token age (1 day to 3+ months)' },
];

const DEV_SCORE_BONUSES = [
  { name: 'First Migration', points: 150, icon: CheckCircle, description: 'Major bonus for first successful migration' },
  { name: 'Additional Migrations', points: 75, icon: TrendingUp, description: 'Each migration after the first' },
  { name: '$100K Market Cap', points: 50, icon: Coins, description: 'Bonus per token hitting $100K' },
  { name: '$500K Market Cap', points: 75, icon: Coins, description: 'Bonus per token hitting $500K' },
  { name: '$1M Market Cap', points: 100, icon: Target, description: 'Bonus per token hitting $1M+' },
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
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-accent flex items-center justify-center border-2 border-border shadow-[2px_2px_0px_0px_var(--border)] sm:shadow-[4px_4px_0px_0px_var(--border)] shrink-0">
              <Code size={20} className="text-cream sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-black font-display-mock text-dark leading-tight">
              HOW IT <span className="text-accent">WORKS</span>
            </h1>
          </div>
          <p className="text-base sm:text-lg md:text-xl max-w-2xl font-medium leading-relaxed text-text-muted">
            On-chain reputation for Solana token creators. Understand scoring, tiers, and how to build your developer credibility.
          </p>
        </div>
      </div>

      {/* Mobile TOC */}
      <div className="xl:hidden px-4 sm:px-6 py-4 bg-card border-b-2 border-border overflow-x-auto mobile-scroll-hidden">
        <div className="flex gap-2 min-w-max">
          {SECTIONS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium whitespace-nowrap rounded-full border transition-colors ${
                activeSection === id
                  ? 'bg-accent text-cream border-accent'
                  : 'text-dark/60 border-dark/20 hover:border-accent/50 active:bg-accent/10'
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
        <aside className="hidden xl:block w-64 shrink-0 border-r-2 border-dark/20 bg-card sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="p-6">
            <div className="text-xs font-bold uppercase tracking-widest text-dark/40 mb-4">On This Page</div>
            <ul className="space-y-1">
              {SECTIONS.map(({ id, label }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-l-2 ${
                      activeSection === id
                        ? 'bg-accent/10 text-accent border-accent'
                        : 'text-dark/60 hover:text-dark hover:bg-dark/5 border-transparent'
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
          <section id="quick-start" className="py-10 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-card border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display-mock text-dark mb-3 sm:mb-4">Quick Start</h2>
              <p className="text-dark/60 mb-6 sm:mb-10 text-base sm:text-lg">Get your DevCred profile set up in minutes.</p>

              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                {[
                  { step: 1, icon: Wallet, title: 'Connect Wallet', desc: 'Sign in with your Solana wallet. Sign a message to prove ownership - no transaction needed.' },
                  { step: 2, icon: BarChart3, title: 'Get Scored', desc: 'We scan your on-chain launch history and calculate your DevCred score automatically.' },
                  { step: 3, icon: LinkIcon, title: 'Link X (Optional)', desc: 'Connect your X account to display your profile pic and handle in the extension.' },
                ].map((item) => (
                  <div key={item.step} className="group bg-cream border-2 border-dark/20 p-4 sm:p-6 lg:hover:border-accent/50 lg:hover:shadow-[4px_4px_0px_0px_var(--accent)] transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-accent border-2 border-dark flex items-center justify-center mb-3 sm:mb-4">
                      <item.icon size={20} className="text-cream sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-[10px] sm:text-xs font-bold text-accent mb-1.5 sm:mb-2">STEP {item.step}</div>
                    <h3 className="font-bold text-base sm:text-lg mb-1.5 sm:mb-2 text-dark">{item.title}</h3>
                    <p className="text-dark/60 text-xs sm:text-sm">{item.desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 sm:mt-10 flex flex-wrap gap-3 sm:gap-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="accent" className="w-full sm:w-auto">
                    Claim Your Profile <ArrowRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Chrome Extension */}
          <section id="extension" className="py-16 md:py-20 px-6 md:px-12 bg-inverted-bg border-b-2 border-inverted-bg/50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-inverted-text mb-4">Chrome Extension</h2>
              <p className="text-inverted-muted mb-10 text-lg">See dev reputation scores directly on Axiom.trade while you trade.</p>

              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-[#252830] border-2 border-inverted-text/10 p-6">
                  <Chrome size={32} className="text-accent mb-4" />
                  <h3 className="font-bold text-xl text-inverted-text mb-3">What It Does</h3>
                  <ul className="space-y-2 text-inverted-muted text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-success mt-0.5 shrink-0" />
                      Shows DevCred score badge on token pages
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-success mt-0.5 shrink-0" />
                      Displays dev&apos;s X profile if linked
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-success mt-0.5 shrink-0" />
                      Color-coded risk indicator (green/yellow/red)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle size={16} className="text-success mt-0.5 shrink-0" />
                      Shows migration count and rug history
                    </li>
                  </ul>
                </div>

                <div className="bg-[#252830] border-2 border-inverted-text/10 p-6">
                  <Shield size={32} className="text-accent mb-4" />
                  <h3 className="font-bold text-xl text-inverted-text mb-3">Badge Colors</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-success"></div>
                      <span className="text-inverted-muted text-sm">Elite/Legend (600+ score)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-warning"></div>
                      <span className="text-inverted-muted text-sm">Proven/Builder (300-599)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-score-low"></div>
                      <span className="text-inverted-muted text-sm">Verified (150-299)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-error"></div>
                      <span className="text-inverted-muted text-sm">Penalized (rugs detected)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full bg-score-verified"></div>
                      <span className="text-inverted-muted text-sm">New/Unknown (0 score)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-accent/20 border-2 border-accent p-6">
                <h4 className="font-bold text-inverted-text mb-2">Installation</h4>
                <ol className="text-inverted-muted text-sm space-y-2">
                  <li>1. Go to <code className="bg-[#13151a] px-2 py-0.5 rounded">chrome://extensions</code></li>
                  <li>2. Enable &quot;Developer mode&quot; (top right)</li>
                  <li>3. Click &quot;Load unpacked&quot; and select the extension folder</li>
                  <li>4. Navigate to axiom.trade to see it in action</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Scoring System */}
          <section id="scoring" className="py-16 md:py-20 px-6 md:px-12 bg-card border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">Scoring System</h2>
              <p className="text-dark/60 mb-10 text-lg">
                Each token scores <strong className="text-accent">0-100 points</strong>. Your DevCred score (0-740) combines token scores + migration bonuses.
              </p>

              {/* Token Score */}
              <div className="bg-cream border-2 border-dark/20 p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                  <BarChart3 size={24} className="text-accent" />
                  <h3 className="font-bold text-xl text-dark">Token Score (per token)</h3>
                  <span className="ml-auto text-sm font-bold text-dark/50">Max 100 pts</span>
                </div>
                <div className="space-y-3">
                  {TOKEN_SCORE_COMPONENTS.map((component) => (
                    <div key={component.name} className="flex items-center gap-4 p-4 bg-card border-2 border-dark/10 hover:border-accent/30 transition-colors">
                      <div className="w-10 h-10 bg-accent/10 flex items-center justify-center shrink-0">
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

              {/* Dev Score Bonuses */}
              <div className="bg-success-light border-2 border-success-border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp size={24} className="text-success" />
                  <h3 className="font-bold text-xl text-dark">Migration & Market Cap Bonuses</h3>
                </div>
                <div className="space-y-3">
                  {DEV_SCORE_BONUSES.map((bonus) => (
                    <div key={bonus.name} className="flex items-center gap-4 p-4 bg-card border-2 border-success/30 hover:border-success/60 transition-colors">
                      <div className="w-10 h-10 bg-success/10 flex items-center justify-center shrink-0">
                        <bonus.icon size={20} className="text-success" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-dark">{bonus.name}</span>
                        <span className="text-dark/50 text-sm ml-2 hidden sm:inline">— {bonus.description}</span>
                      </div>
                      <span className="text-success font-black text-lg">+{bonus.points}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 bg-error-light border-2 border-error-border p-6 flex items-start gap-4">
                <AlertTriangle size={24} className="text-error shrink-0" />
                <div>
                  <h3 className="font-bold text-lg text-error mb-1">Rug Penalty</h3>
                  <p className="text-error/80">
                    Tokens flagged as rugs receive a <strong>-150 point penalty</strong> to your dev score. Multiple rugs stack.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tiers */}
          <section id="tiers" className="py-16 md:py-20 px-6 md:px-12 bg-cream border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">Reputation Tiers</h2>
              <p className="text-dark/60 mb-10 text-lg">
                Your tier represents overall reputation. Higher tiers require both high scores and successful launches.
              </p>

              <div className="grid gap-4">
                {TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className="group bg-card border-2 border-dark/20 p-5 hover:border-accent/30 hover:shadow-[4px_4px_0px_0px_var(--accent)] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center gap-4 shrink-0">
                        <div className={`w-12 h-12 flex items-center justify-center border-2 border-dark/20 ${tier.bgClass}`}>
                          <tier.icon size={24} className={tier.colorClass} />
                        </div>
                        <div className="sm:w-28">
                          <h3 className={`text-lg font-black ${tier.colorClass}`}>
                            {tier.name}
                          </h3>
                          <div className="text-xs text-dark/50 font-mono">{tier.score} pts</div>
                        </div>
                      </div>
                      <div className="flex-1 text-sm text-dark/60">{tier.description}</div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {tier.requirements.map((req, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 text-xs font-bold uppercase border ${tier.borderClass} ${tier.colorClass}`}
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
          <section id="migration" className="py-16 md:py-20 px-6 md:px-12 bg-card border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">What is a Migration?</h2>
              <p className="text-dark/60 mb-10 text-lg">
                When your token graduates from pump.fun&apos;s bonding curve to a major DEX with real liquidity.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-success-light border-2 border-success-border p-6">
                  <h3 className="font-bold text-lg mb-4 text-success flex items-center gap-2">
                    <CheckCircle size={20} />
                    Counts as Migration
                  </h3>
                  <ul className="space-y-3 text-success">
                    {['Raydium liquidity pool', 'Orca whirlpool', 'Meteora pool', 'PumpSwap AMM', 'Jupiter routing'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle size={16} /> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-error-light border-2 border-error-border p-6">
                  <h3 className="font-bold text-lg mb-4 text-error flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Does NOT Count
                  </h3>
                  <ul className="space-y-3 text-error">
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
          <section id="fizzled-vs-rugged" className="py-16 md:py-20 px-6 md:px-12 bg-cream border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">Fizzled vs Rugged</h2>
              <p className="text-dark/60 mb-10 text-lg">
                We distinguish tokens that didn&apos;t gain traction from tokens where devs dumped on holders.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-warning-light border-2 border-warning-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <HelpCircle size={24} className="text-warning" />
                    <h3 className="font-bold text-xl text-warning">Fizzled</h3>
                  </div>
                  <p className="text-warning mb-4">
                    Didn&apos;t gain traction or failed to migrate. No malicious intent.
                  </p>
                  <ul className="space-y-2 text-warning text-sm">
                    <li>• Low score, but <strong>no penalty</strong></li>
                    <li>• Dev kept tokens or sold slowly</li>
                    <li>• Common for early builders</li>
                  </ul>
                </div>
                <div className="bg-error-light border-2 border-error-border p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle size={24} className="text-error" />
                    <h3 className="font-bold text-xl text-error">Rugged</h3>
                  </div>
                  <p className="text-error mb-4">
                    Dev dumped significant supply on holders, causing price crash.
                  </p>
                  <ul className="space-y-2 text-error text-sm">
                    <li>• <strong>-150 point penalty</strong> per rug</li>
                    <li>• Dev sold &gt;50% supply quickly</li>
                    <li>• Seriously damages reputation</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-5 bg-success-light border-2 border-success-border flex items-start gap-4">
                <CheckCircle size={24} className="text-success shrink-0" />
                <p className="text-success">
                  <strong>Key Insight:</strong> A dev with 5 fizzled tokens and 2 migrations can still have an excellent score.
                  DevCred rewards legitimate builders who keep trying.
                </p>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section id="data-sources" className="py-16 md:py-20 px-6 md:px-12 bg-card border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-4">Data Sources</h2>
              <p className="text-dark/60 mb-10 text-lg">
                We aggregate data from multiple trusted on-chain sources.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-cream border-2 border-dark/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent/10 flex items-center justify-center">
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
                <div className="bg-cream border-2 border-dark/20 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-accent/10 flex items-center justify-center">
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

          {/* API Reference */}
          <section id="api" className="py-16 md:py-20 px-6 md:px-12 bg-inverted-bg border-b-2 border-inverted-bg/50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-inverted-text mb-4">API Reference</h2>
              <p className="text-inverted-muted mb-10 text-lg">
                Public endpoints for integrating DevCred data into your app or extension.
              </p>

              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-accent mb-2 uppercase tracking-wider">Reputation (Recommended)</div>
                  <CodeBlock copyText="GET https://devkarma.fun/api/reputation/{walletAddress}">
                    <div className="text-accent mb-2"># Get dev reputation by wallet address</div>
                    <div className="text-inverted-text">GET /api/reputation/&#123;walletAddress&#125;</div>
                    <div className="text-inverted-muted mt-3 text-xs">
                      Returns: score, tier, tierName, tokenCount, rugCount, migrationCount, twitterHandle, avatarUrl
                    </div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-inverted-muted mb-2 uppercase tracking-wider">Profile</div>
                  <CodeBlock copyText="GET /api/profile/{handle}">
                    <div className="text-accent mb-2"># Get full profile by handle or wallet</div>
                    <div className="text-inverted-text">GET /api/profile/&#123;handle&#125;</div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-inverted-muted mb-2 uppercase tracking-wider">Leaderboard</div>
                  <CodeBlock copyText="GET /api/leaderboard?limit=50">
                    <div className="text-accent mb-2"># Get top developers</div>
                    <div className="text-inverted-text">GET /api/leaderboard?limit=50</div>
                  </CodeBlock>
                </div>

                <div>
                  <div className="text-xs font-bold text-inverted-muted mb-2 uppercase tracking-wider">Token Lookup</div>
                  <CodeBlock copyText="GET /api/token/lookup?mint={mintAddress}">
                    <div className="text-accent mb-2"># Look up token by mint address</div>
                    <div className="text-inverted-text">GET /api/token/lookup?mint=&#123;mintAddress&#125;</div>
                  </CodeBlock>
                </div>
              </div>

              <div className="mt-6 p-4 bg-accent/20 border-2 border-accent flex items-start gap-3">
                <Code size={20} className="text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-inverted-text">
                  <strong>Rate Limits:</strong> Public endpoints are rate-limited. For high-volume access, reach out on X @devcredfun.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="py-16 md:py-20 px-6 md:px-12 bg-cream border-b-2 border-dark/20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark mb-10">FAQ</h2>

              <div className="space-y-4">
                {[
                  { q: 'How do I claim my profile?', a: 'Connect your Solana wallet and sign a message to prove ownership. No transaction or fees required. Your profile is created instantly.' },
                  { q: 'How do I link my X account?', a: 'After connecting your wallet, go to your profile page and click "Connect X Account" in the account settings section. This lets the extension show your X profile pic.' },
                  { q: 'What if I have multiple wallets?', a: 'You can add multiple wallets to your profile. Click "Add Wallet" on your profile page and verify each one. All tokens from verified wallets contribute to your score.' },
                  { q: 'How often is my score updated?', a: 'Your score is recalculated when your profile is viewed. Market data and holder counts are fetched in real-time from on-chain sources.' },
                  { q: 'How do I improve my score?', a: 'Launch quality tokens that migrate to DEX, maintain holder retention, don\'t dump your supply. Each successful migration gives significant bonus points.' },
                  { q: 'Can I dispute my score?', a: 'Scores are calculated entirely from on-chain data. If you believe there\'s an error, reach out on X @devcredfun.' },
                  { q: 'Is the extension safe?', a: 'Yes. The extension only reads data from Axiom pages and our API. It never requests wallet permissions or transaction signing.' },
                  { q: 'Why doesn\'t my X show in the extension?', a: 'Make sure you\'ve linked your X account on devkarma.fun. Only real X accounts (not auto-generated handles) are displayed.' },
                ].map((item, idx) => (
                  <div key={idx} className="border-2 border-dark/20 p-5 bg-card hover:border-accent/30 transition-colors">
                    <h3 className="font-bold text-lg mb-2 text-dark">{item.q}</h3>
                    <p className="text-dark/60">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-16 md:py-24 px-6 md:px-12 bg-inverted-bg text-inverted-text text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] grid-pattern" />

            <div className="max-w-2xl mx-auto relative z-10">
              <h2 className="text-3xl md:text-5xl font-black font-display-mock mb-6 leading-tight">
                BUILD YOUR <span className="text-accent">REPUTATION</span>
              </h2>
              <p className="text-lg text-inverted-muted mb-8">
                Claim your profile and let your launches speak for themselves.
              </p>
              <Link href="/login">
                <Button variant="accent" className="text-lg px-8 py-3 h-auto">
                  Get Started <ArrowRight size={20} />
                </Button>
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
