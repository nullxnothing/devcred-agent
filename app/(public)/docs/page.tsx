import Link from 'next/link';
import {
  Trophy, Shield, Star, Zap, CheckCircle, Award,
  ArrowRight, Coins, TrendingUp, Users, Clock, AlertTriangle,
  Wallet, BarChart3, Target, Database, Globe, Code, HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const TIERS = [
  {
    name: 'Legend',
    color: '#FFD700',
    icon: Trophy,
    score: '720+',
    requirements: ['720+ DevKarma Score', '5+ Successful Migrations', '6+ Months Active'],
    description: 'The elite tier. Reserved for developers with an exceptional track record of successful launches and community trust.',
  },
  {
    name: 'Elite',
    color: '#9B59B6',
    icon: Star,
    score: '700+',
    requirements: ['700+ DevKarma Score', '3+ Successful Migrations'],
    description: 'Highly accomplished developers with multiple proven successful token launches.',
  },
  {
    name: 'Proven',
    color: '#27AE60',
    icon: CheckCircle,
    score: 'Any',
    requirements: ['1+ Successful Migration'],
    description: 'Developers who have successfully migrated at least one token to a DEX.',
  },
  {
    name: 'Builder',
    color: '#3498DB',
    icon: Zap,
    score: 'Any',
    requirements: ['3+ Tokens Launched'],
    description: 'Active developers with multiple token launches under their belt.',
  },
  {
    name: 'Verified',
    color: '#95A5A6',
    icon: Shield,
    score: 'Any',
    requirements: ['1+ Verified Wallet'],
    description: 'New developers who have verified ownership of their wallet.',
  },
  {
    name: 'Unverified',
    color: '#BDC3C7',
    icon: Award,
    score: '0',
    requirements: ['No verified wallets'],
    description: 'Profiles that have been scanned but not yet claimed by the developer.',
  },
];

const SCORE_COMPONENTS = [
  {
    name: 'Migration Bonus',
    maxPoints: 50,
    icon: TrendingUp,
    description: 'Awarded when a token successfully migrates from pump.fun to Raydium, Orca, or other major DEXes.',
  },
  {
    name: 'ATH Market Cap',
    maxPoints: 30,
    icon: Coins,
    description: '+1 point per $100K market cap achieved. Measures the success and adoption of your token.',
  },
  {
    name: 'Holder Retention',
    maxPoints: 20,
    icon: Users,
    description: 'Measures how well holders are retained over time. +1 point per 100 current holders.',
  },
  {
    name: 'Dev Behavior',
    maxPoints: 20,
    icon: Shield,
    description: 'Rewards developers who don\'t dump their tokens. Heavy selling reduces this score.',
  },
  {
    name: 'Bundle Behavior',
    maxPoints: 15,
    icon: Target,
    description: 'Low bundle percentage = higher score. <5% bundled gets full points.',
  },
  {
    name: 'Longevity',
    maxPoints: 10,
    icon: Clock,
    description: '+1 point per week the token has been active. Rewards long-term projects.',
  },
  {
    name: 'Community',
    maxPoints: 5,
    icon: Users,
    description: 'Bonus for tokens with active communities (Twitter, Telegram, Discord).',
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-dark text-cream py-16 md:py-24 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-5 font-display-mock text-[30rem] leading-none pointer-events-none select-none">
          ?
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-7xl font-black font-display-mock mb-6">
            HOW <span className="text-accent">DEVKARMA</span> WORKS
          </h1>
          <p className="text-xl md:text-2xl text-cream/80 max-w-2xl leading-relaxed">
            DevKarma is an on-chain reputation system for Solana developers.
            We analyze your token launches to create a trust score that speaks for itself.
          </p>
        </div>
      </div>

      {/* Quick Start */}
      <div className="py-16 px-6 md:px-12 bg-cream border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-8">Quick Start</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
              <div className="w-12 h-12 bg-accent border-2 border-dark flex items-center justify-center mb-4 font-black text-xl">1</div>
              <h3 className="font-bold text-lg mb-2">Connect Twitter</h3>
              <p className="text-dark/70 text-sm">Sign in with your Twitter account to claim your profile.</p>
            </div>
            <div className="bg-white border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
              <div className="w-12 h-12 bg-accent border-2 border-dark flex items-center justify-center mb-4 font-black text-xl">2</div>
              <h3 className="font-bold text-lg mb-2">Verify Wallet</h3>
              <p className="text-dark/70 text-sm">Connect and sign with your dev wallet to prove ownership.</p>
            </div>
            <div className="bg-white border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
              <div className="w-12 h-12 bg-accent border-2 border-dark flex items-center justify-center mb-4 font-black text-xl">3</div>
              <h3 className="font-bold text-lg mb-2">Get Your Score</h3>
              <p className="text-dark/70 text-sm">We scan your launches and calculate your DevKarma score.</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/login">
              <Button variant="accent">
                Claim Your Profile <ArrowRight size={18} />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Scoring System */}
      <div className="py-16 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">Scoring System</h2>
          <p className="text-dark/70 mb-8 text-lg">
            Each token you launch is scored from <strong>0-150 points</strong>. Your DevKarma score
            (0-740) is calculated from the weighted average of all your token scores.
          </p>

          <div className="bg-cream border-2 border-dark p-6 mb-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <BarChart3 size={24} />
              Token Score Breakdown (Max 150 points)
            </h3>
            <div className="grid gap-4">
              {SCORE_COMPONENTS.map((component) => (
                <div key={component.name} className="flex items-start gap-4 p-4 bg-white border border-dark/10">
                  <div className="w-10 h-10 bg-dark/5 flex items-center justify-center flex-shrink-0">
                    <component.icon size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">{component.name}</span>
                      <span className="text-accent font-bold">+{component.maxPoints} max</span>
                    </div>
                    <p className="text-sm text-dark/70">{component.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-red-50 border-2 border-red-200 p-6">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-red-700">
              <AlertTriangle size={24} />
              Rug Penalty
            </h3>
            <p className="text-red-700">
              Tokens flagged as rugs receive a <strong>-100 point penalty</strong>.
              This significantly impacts your overall DevKarma score and tier.
            </p>
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="py-16 px-6 md:px-12 bg-cream border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">Reputation Tiers</h2>
          <p className="text-dark/70 mb-8 text-lg">
            Your tier represents your overall reputation. Higher tiers require both a high score
            and proof of successful launches.
          </p>

          <div className="grid gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className="bg-white border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]"
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 flex items-center justify-center border-2 border-dark"
                      style={{ backgroundColor: tier.color + '30' }}
                    >
                      <tier.icon size={32} style={{ color: tier.color }} />
                    </div>
                    <div>
                      <h3
                        className="text-2xl font-black font-display-mock"
                        style={{ color: tier.color }}
                      >
                        {tier.name}
                      </h3>
                      <div className="text-sm text-dark/50">Score: {tier.score}</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-dark/70 mb-3">{tier.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {tier.requirements.map((req, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs font-bold uppercase border"
                          style={{ borderColor: tier.color, color: tier.color }}
                        >
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What Counts as Migration */}
      <div className="py-16 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">What is a Migration?</h2>
          <p className="text-dark/70 mb-8 text-lg">
            A &quot;migration&quot; is when your token graduates from pump.fun&apos;s bonding curve to a
            major DEX with real liquidity.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-green-50 border-2 border-green-600 p-6">
              <h3 className="font-bold text-lg mb-4 text-green-700">Counts as Migration</h3>
              <ul className="space-y-2 text-green-700">
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} /> Raydium liquidity pool
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} /> Orca whirlpool
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} /> Meteora pool
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={16} /> Jupiter routing
                </li>
              </ul>
            </div>
            <div className="bg-red-50 border-2 border-red-400 p-6">
              <h3 className="font-bold text-lg mb-4 text-red-700">Does NOT Count</h3>
              <ul className="space-y-2 text-red-700">
                <li className="flex items-center gap-2">
                  <AlertTriangle size={16} /> Still on pump.fun curve
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle size={16} /> No trading activity
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle size={16} /> Removed liquidity
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Fizzled vs Rugged */}
      <div className="py-16 px-6 md:px-12 bg-cream border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">Fizzled ≠ Rugged</h2>
          <p className="text-dark/70 mb-8 text-lg">
            DevKarma distinguishes between tokens that simply didn&apos;t gain traction and tokens
            where the developer actively dumped on holders.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-amber-50 border-2 border-amber-500 p-6">
              <h3 className="font-bold text-lg mb-4 text-amber-700 flex items-center gap-2">
                <HelpCircle size={20} />
                Fizzled Token
              </h3>
              <p className="text-amber-700 mb-4">
                A token that didn&apos;t gain traction or failed to migrate. No malicious intent — just
                market conditions or lack of interest.
              </p>
              <ul className="space-y-2 text-amber-700 text-sm">
                <li>• Low score, but no penalty</li>
                <li>• Dev kept their tokens or sold slowly</li>
                <li>• Common for early builders experimenting</li>
              </ul>
            </div>
            <div className="bg-red-50 border-2 border-red-500 p-6">
              <h3 className="font-bold text-lg mb-4 text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} />
                Rugged Token
              </h3>
              <p className="text-red-700 mb-4">
                A token where the developer dumped a significant portion of supply on holders,
                causing major price crashes.
              </p>
              <ul className="space-y-2 text-red-700 text-sm">
                <li>• -100 point penalty per rug</li>
                <li>• Dev sold &gt;50% supply quickly</li>
                <li>• Seriously damages overall reputation</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 border-2 border-green-500">
            <p className="text-green-700">
              <strong>Key Insight:</strong> A developer with 5 fizzled tokens and 2 migrations
              can still have an excellent score. DevKarma rewards legitimate builders who
              keep trying, even if not every launch succeeds.
            </p>
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="py-16 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">Data Sources</h2>
          <p className="text-dark/70 mb-8 text-lg">
            DevKarma aggregates data from multiple trusted sources to provide accurate scoring.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-cream border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
              <div className="flex items-center gap-3 mb-4">
                <Database size={28} className="text-accent" />
                <h3 className="font-bold text-xl">Helius</h3>
              </div>
              <p className="text-dark/70 mb-3">
                Solana&apos;s leading RPC and indexing provider. We use Helius for:
              </p>
              <ul className="space-y-1 text-sm text-dark/70">
                <li>• Token discovery via DAS API</li>
                <li>• Holder count tracking</li>
                <li>• Transaction history analysis</li>
                <li>• Creator wallet verification</li>
              </ul>
            </div>
            <div className="bg-cream border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
              <div className="flex items-center gap-3 mb-4">
                <Globe size={28} className="text-accent" />
                <h3 className="font-bold text-xl">DexScreener</h3>
              </div>
              <p className="text-dark/70 mb-3">
                Real-time DEX analytics and market data. We use DexScreener for:
              </p>
              <ul className="space-y-1 text-sm text-dark/70">
                <li>• Migration detection (Raydium, Orca, etc.)</li>
                <li>• Market cap & volume data</li>
                <li>• Liquidity tracking</li>
                <li>• Trading pair information</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Scanning */}
      <div className="py-16 px-6 md:px-12 bg-cream border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">Wallet Scanning</h2>
          <p className="text-dark/70 mb-8 text-lg">
            You can search for any Solana wallet address to see a developer&apos;s launch history,
            even if they haven&apos;t claimed their profile yet.
          </p>

          <div className="bg-white border-2 border-dark p-6 shadow-[4px_4px_0px_0px_#3B3B3B]">
            <div className="flex items-start gap-4">
              <Wallet size={32} className="text-accent flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-2">How It Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-dark/70">
                  <li>Enter any Solana wallet address in the search bar</li>
                  <li>We scan on-chain data for tokens created by that wallet</li>
                  <li>A profile is automatically generated with their launch history</li>
                  <li>The developer can later claim and verify ownership of the profile</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-accent/10 border-2 border-accent">
            <p className="text-sm">
              <strong>Note:</strong> Unclaimed profiles show as &quot;Unverified&quot; until the
              developer signs in and verifies wallet ownership.
            </p>
          </div>
        </div>
      </div>

      {/* API Reference */}
      <div className="py-16 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-4">API Reference</h2>
          <p className="text-dark/70 mb-8 text-lg">
            DevKarma provides public API endpoints for integrating reputation data into your app.
          </p>

          <div className="space-y-6">
            <div className="bg-dark text-cream p-6 font-mono text-sm overflow-x-auto">
              <div className="text-accent mb-2"># Get profile by Twitter handle or wallet address</div>
              <div className="text-cream/80">GET /api/profile/&#123;handle&#125;</div>
              <div className="mt-4 text-accent"># Example responses</div>
              <div className="text-cream/60">GET /api/profile/satoshi</div>
              <div className="text-cream/60">GET /api/profile/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU</div>
            </div>

            <div className="bg-dark text-cream p-6 font-mono text-sm overflow-x-auto">
              <div className="text-accent mb-2"># Get leaderboard</div>
              <div className="text-cream/80">GET /api/leaderboard?limit=50</div>
              <div className="mt-4 text-cream/60"># Returns top developers ranked by score</div>
            </div>

            <div className="bg-dark text-cream p-6 font-mono text-sm overflow-x-auto">
              <div className="text-accent mb-2"># Search wallets/handles</div>
              <div className="text-cream/80">GET /api/search?q=&#123;query&#125;</div>
            </div>

            <div className="bg-dark text-cream p-6 font-mono text-sm overflow-x-auto">
              <div className="text-accent mb-2"># Look up token by mint address</div>
              <div className="text-cream/80">GET /api/token/lookup?mint=&#123;mintAddress&#125;</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-accent/10 border-2 border-accent flex items-start gap-3">
            <Code size={20} className="text-accent flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              <strong>Rate Limits:</strong> API endpoints are rate-limited. For high-volume access,
              please reach out on Twitter for API key access.
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-16 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock mb-8">FAQ</h2>

          <div className="space-y-6">
            <div className="border-2 border-dark p-6">
              <h3 className="font-bold text-lg mb-2">How often is my score updated?</h3>
              <p className="text-dark/70">
                Your score is recalculated each time your profile is viewed. Market data and
                holder counts are fetched in real-time from on-chain sources.
              </p>
            </div>

            <div className="border-2 border-dark p-6">
              <h3 className="font-bold text-lg mb-2">Can I dispute my score?</h3>
              <p className="text-dark/70">
                Scores are calculated entirely from on-chain data. If you believe there&apos;s an
                error, reach out on Twitter and we&apos;ll investigate.
              </p>
            </div>

            <div className="border-2 border-dark p-6">
              <h3 className="font-bold text-lg mb-2">How do I improve my score?</h3>
              <p className="text-dark/70">
                Launch quality tokens that migrate successfully, maintain holder retention,
                don&apos;t dump your supply, and keep low bundle percentages. Time also helps —
                longer-running tokens score higher.
              </p>
            </div>

            <div className="border-2 border-dark p-6">
              <h3 className="font-bold text-lg mb-2">What if I have multiple wallets?</h3>
              <p className="text-dark/70">
                You can verify multiple wallets on your profile. All tokens from verified
                wallets contribute to your overall DevKarma score.
              </p>
            </div>

            <div className="border-2 border-dark p-6">
              <h3 className="font-bold text-lg mb-2">Is my data private?</h3>
              <p className="text-dark/70">
                All data is derived from public on-chain transactions. DevKarma doesn&apos;t access
                any private wallet data — only publicly visible blockchain history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-20 px-6 md:px-12 bg-dark text-cream text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black font-display-mock mb-6">
            Ready to Build Your Reputation?
          </h2>
          <p className="text-xl text-cream/70 mb-8">
            Claim your profile and let your launches speak for themselves.
          </p>
          <Link href="/login">
            <Button variant="accent" className="text-lg px-10 py-4 h-auto">
              Claim Your Profile <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
