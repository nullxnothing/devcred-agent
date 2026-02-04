import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Link as LinkIcon, BarChart3, Trophy, Check, Zap, Search, Chrome, Shield, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExtensionDownloadButton } from '@/components/ui/ExtensionDownloadButton';
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
    <div className="flex flex-col min-h-screen bg-cream">
      {/* --- HERO SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 border-b-2 border-border bg-cream">
        {/* Left: Content */}
        <div className="lg:col-span-7 flex flex-col justify-center px-4 py-8 sm:p-8 md:p-16 lg:p-20 lg:border-r-2 border-border relative overflow-hidden">
          {/* Abstract BG Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>

          <div className="inline-flex items-center gap-2 self-start px-2.5 sm:px-3 py-1 mb-4 sm:mb-6 text-[10px] sm:text-xs font-bold tracking-widest uppercase border-2 border-border bg-card rounded-full shadow-[2px_2px_0px_0px_var(--border)]">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-success rounded-full animate-pulse"></span>
            <span className="whitespace-nowrap">Trusted by Solana traders</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl xl:text-8xl font-black font-display-mock mb-4 sm:mb-6 leading-[0.95] sm:leading-[0.9] tracking-tighter text-dark">
            YOUR LAUNCHES.<br />
            YOUR <span className="text-accent underline decoration-2 sm:decoration-4 underline-offset-2 sm:underline-offset-4 decoration-accent">LEGACY</span>.
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-text-muted mb-4 max-w-lg font-medium leading-relaxed">
            The on-chain credit score for Solana token creators. Know who you&apos;re buying from before you ape.
          </p>

          <ul className="flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 mb-6 sm:mb-10 text-xs sm:text-sm text-text-muted">
            <li className="flex items-center gap-1.5 sm:gap-2">
              <Check size={14} className="text-accent sm:w-4 sm:h-4" />
              <span>Instant rug detection</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <Check size={14} className="text-accent sm:w-4 sm:h-4" />
              <span>Migration history</span>
            </li>
            <li className="flex items-center gap-1.5 sm:gap-2">
              <Check size={14} className="text-accent sm:w-4 sm:h-4" />
              <span>Holder retention</span>
            </li>
          </ul>

          <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 mb-8 sm:mb-12">
            <Link href="/login" className="w-full xs:w-auto">
              <Button variant="accent" className="px-6 sm:px-8 w-full">
                Claim Your Profile <ArrowRight size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/leaderboard" className="w-full xs:w-auto">
              <Button variant="secondary" className="w-full">
                View Leaderboard
              </Button>
            </Link>
          </div>

          {/* Stats Row within Hero Content */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-6 sm:pt-8 border-t-2 border-border">
            <div>
              <div className="text-xl sm:text-2xl md:text-3xl font-stat text-accent">0-740</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted leading-tight">Credit Score</div>
              <div className="text-[9px] sm:text-[10px] text-text-muted/60 mt-0.5 sm:mt-1 hidden sm:block">Based on launch history</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl md:text-3xl font-stat text-dark">7</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted leading-tight">Rep Tiers</div>
              <div className="text-[9px] sm:text-[10px] text-text-muted/60 mt-0.5 sm:mt-1 hidden sm:block">From New to Legend</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl md:text-3xl font-stat text-dark">100%</div>
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-muted leading-tight">On-Chain</div>
              <div className="text-[9px] sm:text-[10px] text-text-muted/60 mt-0.5 sm:mt-1 hidden sm:block">Verified & transparent</div>
            </div>
          </div>
        </div>

        {/* Right: Visual (Card Demo) */}
        <div className="lg:col-span-5 bg-inverted-bg relative flex items-center justify-center p-6 sm:p-8 md:p-12 lg:p-0 overflow-hidden min-h-[380px] sm:min-h-[450px] lg:min-h-auto">
          {/* Grid Pattern - subtle */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'linear-gradient(var(--inverted-text) 1px, transparent 1px), linear-gradient(90deg, var(--inverted-text) 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }}
          ></div>

          {/* The Card */}
          <div className="relative w-full max-w-[280px] sm:max-w-sm transform -rotate-1 lg:hover:rotate-0 transition-transform duration-500 group cursor-default">
            {/* Stamp Seal */}
            <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-accent rounded-full flex items-center justify-center border-2 sm:border-4 border-inverted-text z-20 shadow-lg lg:group-hover:rotate-12 transition-transform duration-500">
              <div className="text-center leading-none transform rotate-12">
                <div className="text-[0.5rem] sm:text-[0.6rem] font-bold uppercase tracking-widest text-[#1a1a1a]/70 mb-0.5 sm:mb-1">Score</div>
                <div className="text-lg sm:text-xl md:text-2xl font-stat text-[#1a1a1a]">684</div>
              </div>
            </div>

            {/* Floating Tags - subtle, hidden on mobile */}
            <div className="absolute top-1/2 -right-10 bg-cream/90 border border-dark/40 px-2.5 py-1 text-[10px] font-bold uppercase shadow-sm z-20 transform rotate-3 hidden xl:block lg:group-hover:translate-x-1 transition-transform">
              3 Migrations
            </div>
            <div className="absolute bottom-16 -left-6 bg-success/90 text-cream border border-dark/30 px-2.5 py-1 text-[10px] font-bold uppercase shadow-sm z-20 transform -rotate-2 hidden xl:block lg:group-hover:-translate-x-1 transition-transform">
              Zero Rugs
            </div>

            <div className="bg-cream border-2 sm:border-4 border-dark p-4 sm:p-6 shadow-[4px_4px_0px_0px_var(--accent)] sm:shadow-[8px_8px_0px_0px_var(--accent)] relative z-10">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-dark to-dark-light border-2 border-border flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                  👨‍💻
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-xl font-bold truncate">@SolanaSteve</h3>
                    <span className="bg-accent text-cream text-[0.5rem] sm:text-[0.6rem] font-black uppercase px-1 sm:px-1.5 py-0.5 border border-dark shrink-0">Proven</span>
                  </div>
                  <p className="text-[10px] sm:text-xs font-mono opacity-60">Building since 2023</p>
                </div>
              </div>

              <div className="bg-card border-2 border-dark p-3 sm:p-4 mb-4 sm:mb-6 relative overflow-hidden">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl sm:text-4xl font-stat leading-none">684</span>
                  <span className="text-[10px] sm:text-xs font-bold uppercase opacity-50 mb-1">/ 740</span>
                </div>
                <div className="w-full h-2 sm:h-3 bg-dark/10 rounded-full overflow-hidden border border-dark/20">
                  <div className="h-full bg-accent w-[92%] border-r-2 border-dark"></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-card border border-dark text-[0.5rem] sm:text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  <Check size={8} className="sm:w-[10px] sm:h-[10px]" /> Wallet
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-card border border-dark text-[0.5rem] sm:text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  <Check size={8} className="sm:w-[10px] sm:h-[10px]" /> Twitter
                </span>
                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-card border border-dark text-[0.5rem] sm:text-[0.6rem] font-bold uppercase flex items-center gap-1">
                  3 Migrations
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- HOW IT WORKS --- */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-card border-b-2 border-border">
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display-mock mb-3 sm:mb-4 text-dark">HOW IT WORKS</h2>
          <p className="text-base sm:text-lg text-text-muted font-medium">Build your on-chain reputation in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="how-it-works-card group relative bg-cream p-6 sm:p-8 lg:hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-dark text-cream flex items-center justify-center font-black text-lg sm:text-xl border-2 border-cream rounded-full">1</div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-card border-2 border-border flex items-center justify-center mb-4 sm:mb-6 mx-auto lg:group-hover:bg-accent lg:group-hover:text-cream transition-colors text-dark">
              <LinkIcon size={24} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold uppercase text-center mb-2 sm:mb-3 text-dark">Connect Wallets</h3>
            <p className="text-center text-sm leading-relaxed text-text-muted">
              Sign in with Twitter and verify ownership of your dev wallets by signing a message.
            </p>
          </div>

          {/* Step 2 */}
          <div className="how-it-works-card group relative bg-cream p-6 sm:p-8 lg:hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-dark text-cream flex items-center justify-center font-black text-lg sm:text-xl border-2 border-cream rounded-full">2</div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-card border-2 border-border flex items-center justify-center mb-4 sm:mb-6 mx-auto lg:group-hover:bg-accent lg:group-hover:text-cream transition-colors text-dark">
              <BarChart3 size={24} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold uppercase text-center mb-2 sm:mb-3 text-dark">We Pull History</h3>
            <p className="text-center text-sm leading-relaxed text-text-muted">
              Our system analyzes every token you&apos;ve launched — migrations, holder retention, and behavior.
            </p>
          </div>

          {/* Step 3 */}
          <div className="how-it-works-card group relative bg-cream p-6 sm:p-8 lg:hover:-translate-y-2 transition-transform duration-300 sm:col-span-2 md:col-span-1">
            <div className="absolute -top-4 sm:-top-5 left-1/2 -translate-x-1/2 w-8 h-8 sm:w-10 sm:h-10 bg-dark text-cream flex items-center justify-center font-black text-lg sm:text-xl border-2 border-cream rounded-full">3</div>
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-card border-2 border-border flex items-center justify-center mb-4 sm:mb-6 mx-auto lg:group-hover:bg-accent lg:group-hover:text-cream transition-colors text-dark">
              <Trophy size={24} className="sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold uppercase text-center mb-2 sm:mb-3 text-dark">Get Your Score</h3>
            <p className="text-center text-sm leading-relaxed text-text-muted">
              Receive your DevCred score (0-740) and a shareable profile to prove your reputation.
            </p>
          </div>
        </div>
      </div>

      {/* --- LOOKUP CTA --- */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-cream border-b-2 border-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 mb-3 sm:mb-4 text-[10px] sm:text-xs font-bold tracking-widest uppercase border-2 border-border bg-card text-dark rounded-full shadow-[2px_2px_0px_0px_var(--border)]">
                🛡️ For Investors & Communities
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display-mock mb-3 sm:mb-4 text-dark">
                CHECK ANY <span className="text-accent">DEV</span>
              </h2>
              <p className="text-base sm:text-lg text-text-muted mb-4 sm:mb-6 leading-relaxed">
                Before you ape, check the dev. Paste any Solana wallet address to instantly see their launch history, rug score, and reputation tier.
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-muted">
                  <Check size={14} className="text-accent sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium">Migration history</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-muted">
                  <Check size={14} className="text-accent sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium">Rug detection</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-text-muted">
                  <Check size={14} className="text-accent sm:w-[18px] sm:h-[18px]" />
                  <span className="font-medium">Holder retention</span>
                </div>
              </div>
            </div>
            <div className="bg-card border-2 border-border p-4 sm:p-6 md:p-8 shadow-[4px_4px_0px_0px_var(--border)] sm:shadow-[8px_8px_0px_0px_var(--border)]">
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-muted mb-2 sm:mb-3">
                Quick Lookup
              </div>
              <form action="/profile" className="flex flex-col gap-3">
                <div className="relative">
                  <input
                    type="text"
                    name="wallet"
                    placeholder="Paste wallet address..."
                    className="w-full h-12 pl-11 pr-4 bg-cream border-2 border-border text-sm font-mono text-dark placeholder:text-text-muted/60 focus:outline-none focus:border-accent rounded-sm"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                </div>
                <Button variant="accent" className="h-12 px-6 w-full sm:w-auto sm:self-start">
                  Check Dev <ArrowRight size={18} />
                </Button>
              </form>
              <p className="text-[10px] sm:text-xs text-text-muted/60 mt-3">
                Works with any Solana wallet that has created tokens on pump.fun
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- BROWSER EXTENSION --- */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-inverted-bg border-b-2 border-border">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            {/* Left: Extension Screenshot */}
            <div className="relative flex justify-center lg:justify-end order-2 lg:order-1">
              <div className="relative max-w-[320px] sm:max-w-md lg:max-w-none">
                {/* Glow effect behind the image */}
                <div className="absolute inset-0 bg-accent/20 blur-3xl rounded-3xl"></div>
                {/* Animated border wrapper */}
                <div className="extension-image-wrapper relative z-10">
                  <Image
                    src="/extension-screenshot.png"
                    alt="DevKarma Chrome Extension showing developer score in Axiom trading terminal"
                    width={500}
                    height={400}
                    priority
                    className="shadow-2xl w-full h-auto"
                  />
                </div>
              </div>
            </div>

            {/* Right: Content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 mb-3 sm:mb-4 text-[10px] sm:text-xs font-bold tracking-widest uppercase border-2 border-inverted-text/20 bg-inverted-text/10 text-accent rounded-full">
                <Chrome size={12} className="sm:w-[14px] sm:h-[14px]" />
                Chrome Extension
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black font-display-mock mb-3 sm:mb-4 text-inverted-text leading-tight">
                SCORES <span className="text-accent">IN YOUR TERMINAL</span>
              </h2>
              <p className="text-base sm:text-lg text-inverted-muted mb-6 sm:mb-8 leading-relaxed">
                Never leave your trading terminal to check a dev. Our Chrome extension injects DevKarma scores directly into Axiom.trade — see reputation at a glance before you ape.
              </p>

              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center shrink-0">
                    <Eye size={18} className="text-accent sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-inverted-text mb-0.5 sm:mb-1 text-sm sm:text-base">Instant Score Display</h4>
                    <p className="text-xs sm:text-sm text-inverted-muted">See the dev&apos;s score, tier, and migration rate without switching tabs.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center shrink-0">
                    <Shield size={18} className="text-accent sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-inverted-text mb-0.5 sm:mb-1 text-sm sm:text-base">Rug Detection Warnings</h4>
                    <p className="text-xs sm:text-sm text-inverted-muted">Get visual alerts when a dev has previous rugs on their record.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center shrink-0">
                    <LinkIcon size={18} className="text-accent sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-inverted-text mb-0.5 sm:mb-1 text-sm sm:text-base">One-Click Full Profile</h4>
                    <p className="text-xs sm:text-sm text-inverted-muted">Click through to see complete launch history, holder retention, and more.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <ExtensionDownloadButton />
                <span className="text-[10px] sm:text-xs text-inverted-muted">Load unpacked in Chrome • Works with Axiom.trade</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- LEADERBOARD PREVIEW --- */}
      <div className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-12 bg-cream">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 sm:mb-12 max-w-5xl mx-auto gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display-mock mb-1 sm:mb-2 text-dark">TOP BUILDERS</h2>
            <p className="font-bold text-text-muted uppercase tracking-widest text-xs sm:text-sm">Leaderboard</p>
          </div>
          <Link href="/leaderboard" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto">View Full Leaderboard</Button>
          </Link>
        </div>

        <div className="max-w-5xl mx-auto flex flex-col gap-3 sm:gap-4">
          {topBuilders.length > 0 ? (
            topBuilders.map((dev, idx) => {
              const profileIdentifier = dev.twitterHandle || dev.primaryWallet || dev.id;
              const displayName = dev.twitterName || (dev.primaryWallet ? `Dev ${dev.primaryWallet.slice(0, 4)}...${dev.primaryWallet.slice(-4)}` : 'Unknown Dev');
              const displayHandle = dev.twitterHandle ? `@${dev.twitterHandle}` : (dev.primaryWallet ? `${dev.primaryWallet.slice(0, 8)}...` : '');

              return (
                <Link
                  key={dev.id}
                  href={`/profile/${encodeURIComponent(profileIdentifier)}`}
                  className="group bg-card border-2 border-border p-3 sm:p-4 md:p-6 flex items-center justify-between lg:hover:translate-x-1 lg:hover:-translate-y-1 active:scale-[0.99] transition-transform cursor-pointer shadow-[3px_3px_0px_0px_var(--border)] sm:shadow-[4px_4px_0px_0px_var(--border)]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-4 md:gap-6 min-w-0">
                    <div
                      className={`
                        w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-black text-base sm:text-xl border-2 border-border shrink-0
                        ${idx === 0 ? 'bg-medal-gold text-cream' : idx === 1 ? 'bg-medal-silver text-dark' : 'bg-medal-bronze text-cream'}
                      `}
                    >
                      #{idx + 1}
                    </div>
                    <Avatar
                      src={dev.avatarUrl}
                      alt={displayName}
                      size="sm"
                      className="border-2 border-border sm:hidden shrink-0"
                    />
                    <Avatar
                      src={dev.avatarUrl}
                      alt={displayName}
                      size="md"
                      className="border-2 border-border hidden sm:block shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-base sm:text-lg md:text-xl flex items-center gap-2 text-dark">
                        <span className="truncate">{displayName}</span>
                        <span className="hidden sm:inline-block shrink-0">
                          <TierBadge
                            tier={dev.tier}
                            tierName={dev.tierName}
                            tierColor={dev.tierColor}
                            size="sm"
                          />
                        </span>
                      </div>
                      <div className="text-[10px] sm:text-xs font-mono text-text-muted truncate">{displayHandle}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                    <div className="text-right">
                      <div className={`text-xl sm:text-2xl md:text-3xl font-stat ${getDevScoreColor(dev.score).textClass}`}>
                        {dev.score}
                      </div>
                    </div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full border border-border lg:group-hover:bg-accent lg:group-hover:border-accent lg:group-hover:text-cream transition-colors text-dark shrink-0">
                      <ArrowRight size={14} className="sm:w-4 sm:h-4" />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="bg-card border-2 border-dashed border-border p-8 sm:p-12 text-center">
              <p className="text-base sm:text-lg font-medium text-text-muted">No verified developers yet.</p>
              <p className="text-xs sm:text-sm text-text-muted/60 mt-2">Be the first to claim your profile!</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CTA SECTION --- */}
      <div className="bg-inverted-bg text-inverted-text py-16 sm:py-20 md:py-24 px-4 sm:px-6 md:px-12 text-center relative overflow-hidden safe-area-bottom">
        {/* Background Decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px] bg-accent/20 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black font-display-mock mb-4 sm:mb-6 leading-tight">
            READY TO BUILD<br /> YOUR LEGACY?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-inverted-muted mb-8 sm:mb-10 max-w-xl mx-auto">
            Join thousands of devs proving their reputation on-chain. Your launches speak for themselves.
          </p>
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-center">
            <Link href="/login" className="inline-block no-underline w-full sm:w-auto">
              <Button
                variant="accent"
                className="text-base sm:text-lg px-6 sm:px-10 py-3 sm:py-4 h-auto shadow-[4px_4px_0px_0px_var(--cream)] sm:shadow-[8px_8px_0px_0px_var(--cream)] hover:shadow-[2px_2px_0px_0px_var(--cream)] sm:hover:shadow-[4px_4px_0px_0px_var(--cream)] w-full sm:w-auto"
              >
                Claim Your Profile <Zap size={18} className="sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="/leaderboard" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="text-base sm:text-lg px-6 sm:px-10 py-3 sm:py-4 h-auto border-inverted-text/30 text-inverted-text hover:bg-inverted-text hover:text-inverted-bg hover:border-inverted-text w-full sm:w-auto"
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
