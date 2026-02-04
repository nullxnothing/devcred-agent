import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { getProfileData } from '@/lib/data-fetching';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileActions, ConnectWalletButton, ShareButton, TokenCard, BadgeGrid, TwitterLink } from '@/components/profile';
import { WalletList } from '@/components/wallet';
import { AddressDisplay } from '@/components/ui/CopyButton';
import { TierBadge } from '@/components/ui/TierBadge';
import { KolBadge } from '@/components/ui/KolBadge';
import { getDevScoreColor } from '@/lib/score-colors';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);
  const profile = await getProfileData(decodedHandle);

  if (!profile) {
    return {
      title: 'Profile Not Found | DevKarma',
    };
  }

  const { user, score, wallets, stats } = profile;
  const primaryWallet = wallets.find((w) => w.isPrimary) || wallets[0];
  
  const displayName = user.twitterName || (primaryWallet?.address ? `Dev ${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-4)}` : 'Unknown Dev');
  const displayHandle = user.twitterHandle || (primaryWallet?.address ? primaryWallet.address.slice(0, 12) : 'unknown');

  const ogParams = new URLSearchParams({
    name: displayName,
    handle: displayHandle,
    score: score.total.toString(),
    tier: score.tierName,
    tierColor: score.tierColor,
    rank: user.rank?.toString() || '-',
    avatar: user.avatarUrl || '',
    wallet: primaryWallet?.address || '',
    tokens: stats.totalTokens.toString(),
    migrations: stats.migratedTokens.toString(),
  });

  const ogImageUrl = `/api/og/profile?${ogParams.toString()}`;

  return {
    title: `${displayName} | DevKarma Score: ${score.total}`,
    description: `${displayName} has a DevKarma score of ${score.total} (${score.tierName}). ${stats.totalTokens} token launches, ${stats.migratedTokens} migrations.`,
    openGraph: {
      title: `${displayName} | DevKarma Score: ${score.total}`,
      description: `DevKarma Score: ${score.total} | Tier: ${score.tierName} | ${stats.totalTokens} Launches`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s DevKarma Profile`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.twitterName} | DevKarma Score: ${score.total}`,
      description: `DevKarma Score: ${score.total} | Tier: ${score.tierName} | ${stats.totalTokens} Launches`,
      images: [ogImageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  const profile = await getProfileData(decodedHandle);

  if (!profile) {
    notFound();
  }

  const { user, score, wallets, tokens, stats } = profile;
  const primaryWallet = wallets.find((w) => w.isPrimary) || wallets[0];
  
  // Display names for wallet-first users
  const displayName = user.twitterName || (primaryWallet?.address ? `Dev ${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-4)}` : 'Unknown Dev');
  const displayHandle = user.twitterHandle || (primaryWallet?.address ? primaryWallet.address.slice(0, 12) : 'unknown');

  return (
    <div className="min-h-screen bg-cream">
      {/* Profile Header */}
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b-2 border-border bg-card relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Identity Section */}
          <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
              {/* Avatar - responsive sizes */}
              <Avatar
                src={user.avatarUrl?.replace('_normal', '_400x400')}
                alt={displayName}
                size="lg"
                className="border-3 sm:border-4 border-border shrink-0 sm:hidden"
                priority
              />
              <Avatar
                src={user.avatarUrl?.replace('_normal', '_400x400')}
                alt={displayName}
                size="xl"
                className="border-4 border-border shrink-0 hidden sm:block"
                priority
              />
              <div className="min-w-0">
                {/* Name Row */}
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black font-display-mock tracking-tight text-dark truncate max-w-[250px] sm:max-w-none">
                    {displayName}
                  </h1>
                  {user.isKol && <KolBadge size="sm" className="sm:hidden" />}
                  {user.isKol && <KolBadge size="md" className="hidden sm:inline-flex" />}
                  {user.twitterHandle && (
                    <a
                      href={`https://x.com/${user.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-accent active:text-accent transition-colors p-1 -m-1"
                      title={`@${user.twitterHandle} on X`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Wallet Row */}
                <div className="font-mono text-xs sm:text-sm text-text-muted mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Wallet size={12} className="sm:w-3.5 sm:h-3.5" />
                  {wallets.length === 0 ? (
                    'No wallet linked'
                  ) : wallets.length === 1 && primaryWallet ? (
                    <AddressDisplay address={primaryWallet.address} className="text-text-muted hover:text-accent" />
                  ) : primaryWallet ? (
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <AddressDisplay address={primaryWallet.address} className="text-text-muted hover:text-accent" />
                      <span className="text-accent text-[10px] sm:text-xs">+{wallets.length - 1} more</span>
                    </span>
                  ) : null}
                  {primaryWallet && (
                    <a
                      href={`https://pump.fun/profile/${primaryWallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 sm:px-2 py-0.5 bg-accent hover:bg-accent-dark active:bg-accent-dark text-cream text-[9px] sm:text-[10px] font-bold uppercase transition-colors"
                    >
                      Pump.fun ↗
                    </a>
                  )}
                </div>

                {/* Tier + Migrations Row */}
                <div className="flex gap-2 items-center flex-wrap">
                  <TierBadge
                    tier={score.tier}
                    tierName={score.tierName}
                    tierColor={score.tierColor}
                    size="sm"
                  />
                  {stats.migratedTokens > 0 && (
                    <span className="px-1.5 sm:px-2 py-0.5 bg-accent/20 border border-accent/30 text-[9px] sm:text-[10px] font-bold uppercase text-dark">
                      {stats.migratedTokens} Migrations
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Share Button */}
            <div className="flex gap-3 w-full sm:w-auto">
              <ShareButton
                handle={displayHandle}
                score={score.total}
                tierName={score.tierName}
                tierColor={score.tierColor}
                rank={user.rank}
                tokenCount={stats.totalTokens}
                migratedCount={stats.migratedTokens}
                avatarUrl={user.avatarUrl ?? undefined}
                walletAddress={primaryWallet?.address}
                twitterName={displayName}
              />
            </div>
          </div>

          {/* Achievement Badges - moved closer */}
          {tokens.length > 0 && (
            <div className="mb-6">
              <BadgeGrid 
                tokens={tokens.map(t => ({
                  mint: t.mint,
                  name: t.name,
                  symbol: t.symbol,
                  athMarketCap: t.athMarketCap,
                  migrated: t.migrated,
                  score: t.score,
                }))}
                title="Achievements"
                maxDisplay={4}
              />
            </div>
          )}

          {/* Stats Bar - unified horizontal layout */}
          <div className="bg-surface/50 p-3 sm:p-4 md:p-6 rounded-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {/* Primary: DevCred Score with emphasis */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted mb-1 font-bold">DevCred Score</div>
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <span className={`text-3xl sm:text-4xl md:text-5xl font-stat ${getDevScoreColor(score.total).textClass}`}>
                    {score.total}
                  </span>
                  <span className="text-text-muted/50 text-[10px] sm:text-xs mb-1.5 sm:mb-2">/740</span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 sm:mt-2 h-1 bg-border/30 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getDevScoreColor(score.total).bgClass} transition-all`}
                    style={{ width: `${Math.min(100, (score.total / 740) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Rank */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted mb-1 font-bold">Rank</div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-stat text-dark">
                  {user.rank ? `#${user.rank}` : '-'}
                </span>
              </div>

              {/* Launches */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted mb-1 font-bold">Launches</div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-stat text-dark">{stats.totalTokens}</span>
              </div>

              {/* Tier */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted mb-1 font-bold">Reputation</div>
                <span className="text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wide text-dark truncate">{score.tierName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:p-6 md:p-12 lg:p-20">
        {/* Account Management Section */}
        <ErrorBoundary>
          <div className="mb-8 sm:mb-12 grid gap-4 sm:gap-6 md:grid-cols-2">
            <WalletList
              profileUserId={user.id}
              wallets={wallets.map(w => ({
                id: w.id,
                address: w.address,
                isPrimary: w.isPrimary,
                label: w.label,
              }))}
            />
            <TwitterLink
              profileUserId={user.id}
              currentTwitterHandle={user.twitterHandle}
              currentAvatarUrl={user.avatarUrl}
            />
          </div>
        </ErrorBoundary>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 border-b-2 border-dark/20 pb-3 sm:pb-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display-mock text-dark">Token History</h2>
          <ErrorBoundary>
            <ProfileActions profileUserId={user.id} hasWallets={wallets.length > 0} />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <Suspense fallback={
            <div className="grid gap-4 sm:gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-2 border-dark/20 bg-card p-4 sm:p-6 h-32 sm:h-48 animate-pulse rounded-sm" />
              ))}
            </div>
          }>
            <div className="grid gap-4 sm:gap-6">
              {tokens.map((token) => (
                <TokenCard key={token.mint} token={token} />
              ))}

              {tokens.length === 0 && (
                <div className="border-2 border-dashed border-dark/30 bg-card p-6 sm:p-10 md:p-16 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-accent/10 border-2 border-dashed border-accent/30 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                    <Wallet size={24} className="text-accent/50 sm:w-7 sm:h-7" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black font-display-mock mb-2 sm:mb-3 text-dark">No Token Launches Yet</h3>
                  <p className="text-sm sm:text-base text-dark/60 mb-4 sm:mb-6 max-w-md mx-auto">
                    Connect a wallet to scan your token launch history and build your reputation.
                  </p>
                  <ConnectWalletButton profileUserId={user.id} />
                </div>
              )}
            </div>
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
}
