import Link from 'next/link';
import { ArrowRight, Link as LinkIcon, BarChart3, Trophy, Check, Zap, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TierBadge } from '@/components/ui/TierBadge';
import { Avatar } from '@/components/ui/Avatar';

import { getLeaderboardData, LeaderboardEntry } from '@/lib/data-fetching';
import { getDevScoreColor } from '@/lib/score-colors';

export const revalidate = 60;

async function getTopBuilders(): Promise<LeaderboardEntry[]> {
  try {
    return await getLeaderboardData(3);
  } catch (error) {
    console.error('Error fetching top builders:', error);
    return [];
  }
}

export default async function HomePage() {
  const topBuilders = await getTopBuilders();

  return (
    <div className="flex flex-col min-h-screen">
      {/* --- HERO SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b-2 border-dark bg-cream">
        {/* Left: Content */}
        <div className="lg:col-span-7 flex flex-col justify-center p-8 md:p-16 lg:p-20 lg:border-r-2 border-dark relative overflow-hidden">
          {/* Abstract BG Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>

          <div className="inline-flex items-center gap-2 self-start px-3 py-1 mb-6 text-xs font-bold tracking-widest uppercase border-2 border-dark bg-white rounded-full shadow-[2px_2px_0px_0px_#3B3B3B]">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            On-chain reputation for Solana devs
          </div>

          <h1 className="text-5xl md:text-7xl xl:text-8xl font-black font-display-mock mb-6 leading-[0.9] tracking-tighter">
            YOUR LAUNCHES.<br />
            YOUR <span className="text-accent underline decoration-4 underline-offset-4 decoration-dark">LEGACY</span>.
          </h1>

          <p className="text-lg md:text-xl text-dark/80 mb-10 max-w-lg font-medium leading-relaxed">
            The on-chain reputation system for Solana devs. Build trust with every launch. Prove you&apos;re not a rugger.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-12">
            <Link href="/login">
              <Button variant="accent" className="sm:px-8 w-full sm:w-auto">
                Claim Your Profile <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="secondary" className="w-full sm:w-auto">
                View Leaderboard
              </Button>
            </Link>
          </div>

          {/* Stats Row within Hero Content */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t-2 border-dark/10">
            <div>
              <div className="text-3xl font-black font-display-mock text-dark">0-740</div>
              <div className="text-xs font-bold uppercase tracking-wider text-dark/50">DevCred Score</div>
            </div>
            <div>
              <div className="text-3xl font-black font-display-mock text-dark">6</div>
              <div className="text-xs font-bold uppercase tracking-wider text-dark/50">Tiers</div>
            </div>
            <div>
              <div className="text-3xl font-black font-display-mock text-dark">100%</div>
              <div className="text-xs font-bold uppercase tracking-wider text-dark/50">On-Chain</div>
            </div>
          </div>
        </div>

        {/* Right: Visual (Card Demo) */}
        <div className="lg:col-span-5 bg-dark relative flex items-center justify-center p-12 lg:p-0 overflow-hidden min-h-[500px] lg:min-h-auto">
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(#FBF0DF 1px, transparent 1px), linear-gradient(90deg, #FBF0DF 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          ></div>

          {/* The Card */}
          <div className="relative w-full max-w-sm transform rotate-[-3deg] hover:rotate-0 transition-transform duration-500 group cursor-default">
            {/* Stamp Seal */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent rounded-full flex items-center justify-center border-4 border-cream z-20 shadow-lg group-hover:rotate-12 transition-transform duration-500">
              <div className="text-center leading-none transform rotate-12">
                <div className="text-[0.6rem] font-black uppercase tracking-widest text-cream/80 mb-1">Score</div>
                <div className="text-2xl font-black font-display-mock text-cream">684</div>
              </div>
            </div>

            {/* Floating Tags */}
            <div className="absolute top-1/2 -right-12 bg-cream border-2 border-dark px-3 py-1 text-xs font-bold uppercase shadow-[4px_4px_0px_0px_#000] z-20 transform rotate-6 hidden md:block group-hover:translate-x-2 transition-transform">
              🔥 3 Migrations
            </div>
            <div className="absolute bottom-12 -left-8 bg-green-400 border-2 border-dark px-3 py-1 text-xs font-bold uppercase shadow-[4px_4px_0px_0px_#000] z-20 transform -rotate-3 hidden md:block group-hover:-translate-x-2 transition-transform">
              🛡️ Zero Rugs
            </div>

            <div className="bg-cream border-4 border-dark p-6 shadow-[16px_16px_0px_0px_#2e4a3b] relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-dark to-gray-800 border-2 border-dark flex items-center justify-center text-3xl">
                  👨‍💻
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold">@SolanaSteve</h3>
                    <span className="bg-accent text-cream text-[0.6rem] font-black uppercase px-1.5 py-0.5 border border-dark">Proven</span>
                  </div>
                  <p className="text-xs font-mono opacity-60">Building since 2023</p>
                </div>
              </div>

              <div className="bg-white border-2 border-dark p-4 mb-6 relative overflow-hidden">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-4xl font-black font-display-mock leading-none">684</span>
                  <span className="text-xs font-bold uppercase opacity-50 mb-1">/ 740 Max</span>
                </div>
                <div className="w-full h-3 bg-dark/10 rounded-full overflow-hidden border border-dark/20">
                  <div className="h-full bg-accent w-[92%] border-r-2 border-dark"></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-white border border-dark text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  <Check size={10} /> Wallet
                </span>
                <span className="px-2 py-1 bg-white border border-dark text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  <Check size={10} /> Twitter
                </span>
                <span className="px-2 py-1 bg-white border border-dark text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  3 Migrations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- HOW IT WORKS --- */}
      <div className="py-20 px-6 md:px-12 bg-white border-b-2 border-dark">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-black font-display-mock mb-4">HOW IT WORKS</h2>
          <p className="text-lg text-dark/70 font-medium">Build your on-chain reputation in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="group relative bg-cream border-2 border-dark p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[8px_8px_0px_0px_#3B3B3B]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-dark text-cream flex items-center justify-center font-black text-xl border-2 border-cream rounded-full">1</div>
            <div className="w-16 h-16 bg-white border-2 border-dark flex items-center justify-center mb-6 mx-auto group-hover:bg-accent group-hover:text-cream transition-colors">
              <LinkIcon size={32} />
            </div>
            <h3 className="text-xl font-bold uppercase text-center mb-3">Connect Wallets</h3>
            <p className="text-center text-sm leading-relaxed opacity-80">
              Sign in with Twitter and verify ownership of your dev wallets by signing a message.
            </p>
          </div>

          {/* Step 2 */}
          <div className="group relative bg-cream border-2 border-dark p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[8px_8px_0px_0px_#3B3B3B]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-dark text-cream flex items-center justify-center font-black text-xl border-2 border-cream rounded-full">2</div>
            <div className="w-16 h-16 bg-white border-2 border-dark flex items-center justify-center mb-6 mx-auto group-hover:bg-accent group-hover:text-cream transition-colors">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-xl font-bold uppercase text-center mb-3">We Pull History</h3>
            <p className="text-center text-sm leading-relaxed opacity-80">
              Our system analyzes every token you&apos;ve launched — migrations, holder retention, and behavior.
            </p>
          </div>

          {/* Step 3 */}
          <div className="group relative bg-cream border-2 border-dark p-8 hover:-translate-y-2 transition-transform duration-300 shadow-[8px_8px_0px_0px_#3B3B3B]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-dark text-cream flex items-center justify-center font-black text-xl border-2 border-cream rounded-full">3</div>
            <div className="w-16 h-16 bg-white border-2 border-dark flex items-center justify-center mb-6 mx-auto group-hover:bg-accent group-hover:text-cream transition-colors">
              <Trophy size={32} />
            </div>
            <h3 className="text-xl font-bold uppercase text-center mb-3">Get Your Score</h3>
            <p className="text-center text-sm leading-relaxed opacity-80">
              Receive your DevCred score (0-740) and a shareable profile to prove your reputation.
            </p>
          </div>
        </div>
      </div>

      {/* --- LOOKUP CTA --- */}
      <div className="py-16 md:py-20 px-6 md:px-12 bg-cream border-b-2 border-dark">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-bold tracking-widest uppercase border-2 border-dark bg-white rounded-full shadow-[2px_2px_0px_0px_#3B3B3B]">
                🛡️ For Investors & Communities
              </div>
              <h2 className="text-4xl md:text-5xl font-black font-display-mock mb-4">
                CHECK ANY <span className="text-accent">DEV</span>
              </h2>
              <p className="text-lg text-dark/70 mb-6 leading-relaxed">
                Before you ape, check the dev. Paste any Solana wallet address to instantly see their launch history, rug score, and reputation tier.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-dark/80">
                  <Check size={18} className="text-accent" />
                  <span className="font-medium">Migration history</span>
                </div>
                <div className="flex items-center gap-2 text-dark/80">
                  <Check size={18} className="text-accent" />
                  <span className="font-medium">Rug detection</span>
                </div>
                <div className="flex items-center gap-2 text-dark/80">
                  <Check size={18} className="text-accent" />
                  <span className="font-medium">Holder retention</span>
                </div>
              </div>
            </div>
            <div className="bg-white border-2 border-dark p-6 md:p-8 shadow-[8px_8px_0px_0px_#3B3B3B]">
              <div className="text-sm font-bold uppercase tracking-wider text-dark/50 mb-3">
                Quick Lookup
              </div>
              <form action="/profile" className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    name="wallet"
                    placeholder="Paste wallet address..."
                    className="w-full h-12 pl-11 pr-4 bg-cream border-2 border-dark/30 text-sm font-mono text-dark placeholder:text-dark/40 focus:outline-none focus:border-accent"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dark/40" size={18} />
                </div>
                <Button variant="accent" className="h-12 px-6 shrink-0">
                  Check Dev <ArrowRight size={18} />
                </Button>
              </form>
              <p className="text-xs text-dark/40 mt-3">
                Works with any Solana wallet that has created tokens on pump.fun
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- LEADERBOARD PREVIEW --- */}
      <div className="py-20 px-6 md:px-12 bg-cream">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 max-w-5xl mx-auto gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black font-display-mock mb-2">TOP BUILDERS</h2>
            <p className="font-bold text-dark/50 uppercase tracking-widest">Leaderboard</p>
          </div>
          <Link href="/leaderboard">
            <Button variant="secondary">View Full Leaderboard</Button>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto flex flex-col gap-4">
          {topBuilders.length > 0 ? (
            topBuilders.map((dev, idx) => {
              const profileIdentifier = dev.twitterHandle || dev.primaryWallet || dev.id;
              const displayName = dev.twitterName || (dev.primaryWallet ? `Dev ${dev.primaryWallet.slice(0, 4)}...${dev.primaryWallet.slice(-4)}` : 'Unknown Dev');
              const displayHandle = dev.twitterHandle ? `@${dev.twitterHandle}` : (dev.primaryWallet ? `${dev.primaryWallet.slice(0, 8)}...` : '');
              
              return (
                <Link
                  key={dev.id}
                  href={`/profile/${encodeURIComponent(profileIdentifier)}`}
                  className="group bg-white border-2 border-dark p-4 md:p-6 flex items-center justify-between hover:translate-x-1 hover:-translate-y-1 transition-transform cursor-pointer shadow-[4px_4px_0px_0px_#3B3B3B]"
                >
                  <div className="flex items-center gap-4 md:gap-6">
                    <div
                      className={`
                        w-10 h-10 flex items-center justify-center font-black text-xl border-2 border-dark
                        ${idx === 0 ? 'bg-[#FFD700]' : idx === 1 ? 'bg-[#C0C0C0]' : 'bg-[#CD7F32]'}
                      `}
                    >
                      #{idx + 1}
                    </div>
                    <Avatar
                      src={dev.avatarUrl}
                      alt={displayName}
                      size="md"
                      className="border-2 border-dark"
                    />
                    <div>
                      <div className="font-bold text-lg md:text-xl flex items-center gap-2">
                        {displayName}
                        <span className="hidden sm:inline-block">
                          <TierBadge
                            tier={dev.tier}
                            tierName={dev.tierName}
                            tierColor={dev.tierColor}
                            size="sm"
                          />
                        </span>
                      </div>
                      <div className="text-xs font-mono opacity-60">{displayHandle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <div className={`text-3xl font-black font-display-mock ${getDevScoreColor(dev.score).textClass}`}>
                        {dev.score}
                      </div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full border border-dark group-hover:bg-accent group-hover:border-accent group-hover:text-cream transition-colors">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="bg-white border-2 border-dashed border-dark/30 p-12 text-center">
              <p className="text-lg font-medium text-dark/50">No verified developers yet.</p>
              <p className="text-sm text-dark/30 mt-2">Be the first to claim your profile!</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CTA SECTION --- */}
      <div className="bg-dark text-cream py-24 px-6 md:px-12 text-center relative overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-black font-display-mock mb-6 leading-tight">
            READY TO BUILD<br /> YOUR LEGACY?
          </h2>
          <p className="text-xl text-cream/70 mb-10 max-w-xl mx-auto">
            Join thousands of devs proving their reputation on-chain. Your launches speak for themselves.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="inline-block no-underline">
              <Button
                variant="accent"
                className="text-lg px-10 py-4 h-auto shadow-[8px_8px_0px_0px_#FBF0DF] hover:shadow-[4px_4px_0px_0px_#FBF0DF]"
              >
                Claim Your Profile <Zap size={20} />
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button
                variant="outline"
                className="text-lg px-10 py-4 h-auto border-cream/30 text-cream hover:bg-cream hover:text-dark hover:border-cream"
                shadow={false}
              >
                View Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
