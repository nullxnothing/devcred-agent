import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { getProfileData } from '@/lib/data-fetching';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileActions, ConnectWalletButton, ShareButton, TokenCard, BadgeGrid } from '@/components/profile';
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
      <div className="bg-dark text-cream p-6 md:p-12 lg:p-20 relative overflow-hidden border-b-2 border-dark">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(#FBF0DF 1px, transparent 1px), linear-gradient(90deg, #FBF0DF 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
        <div className="absolute top-0 right-0 p-12 opacity-10 font-display-mock text-[20rem] leading-none pointer-events-none select-none text-accent">
          {score.total}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <Avatar
                src={user.avatarUrl?.replace('_normal', '_400x400')}
                alt={displayName}
                size="xl"
                className="border-4 border-accent shrink-0"
                priority
              />
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl md:text-5xl font-black font-display-mock tracking-tight">
                    {displayName}
                  </h1>
                  {user.isKol && <KolBadge size="lg" />}
                  {user.twitterHandle && (
                    <a
                      href={`https://x.com/${user.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cream/60 hover:text-accent transition-colors"
                      title={`@${user.twitterHandle} on X`}
                    >
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                  {user.isVerified && (
                    <div className="bg-accent text-cream px-2 py-0.5 text-xs font-bold uppercase">Verified</div>
                  )}
                </div>
                <div className="font-mono text-cream/60 mb-4 flex items-center gap-2 flex-wrap">
                  <Wallet size={16} />
                  {wallets.length === 0 ? (
                    'No wallet linked'
                  ) : wallets.length === 1 && primaryWallet ? (
                    <AddressDisplay address={primaryWallet.address} className="text-cream/60 hover:text-accent" />
                  ) : primaryWallet ? (
                    <span className="flex items-center gap-2">
                      <AddressDisplay address={primaryWallet.address} className="text-cream/60 hover:text-accent" />
                      <span className="text-accent">+{wallets.length - 1} more</span>
                    </span>
                  ) : null}
                  {primaryWallet && (
                    <a
                      href={`https://pump.fun/profile/${primaryWallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded hover:opacity-80 transition-opacity"
                    >
                      Pump.fun ↗
                    </a>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <TierBadge
                    tier={score.tier}
                    tierName={score.tierName}
                    tierColor={score.tierColor}
                    size="md"
                  />
                  {stats.migratedTokens > 0 && (
                    <span className="px-3 py-1 bg-accent/20 border border-accent/30 text-xs font-bold uppercase text-cream">
                      {stats.migratedTokens} Migrations
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
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

          {/* Achievement Badges */}
          {tokens.length > 0 && (
            <div className="mt-8">
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
                maxDisplay={6}
              />
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 border-t border-cream/20 pt-10 mt-8">
            <div className="bg-dark-light border border-cream/20 p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-widest text-cream/50 mb-2 font-bold">DevCred Score</div>
              <div className={`text-4xl md:text-5xl font-black font-display-mock ${getDevScoreColor(score.total).textClass} ${getDevScoreColor(score.total).glowClass}`}>
                {score.total}
              </div>
            </div>
            <div className="bg-dark-light border border-cream/20 p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-widest text-cream/50 mb-2 font-bold">Rank</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock text-cream">
                {user.rank ? `#${user.rank}` : '-'}
              </div>
            </div>
            <div className="bg-dark-light border border-cream/20 p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-widest text-cream/50 mb-2 font-bold">Launches</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock text-cream">{stats.totalTokens}</div>
            </div>
            <div className="bg-dark-light border border-cream/20 p-4 md:p-6">
              <div className="text-[10px] uppercase tracking-widest text-cream/50 mb-2 font-bold">Reputation</div>
              <div className="text-2xl md:text-3xl font-black font-display-mock text-cream">{score.tierName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-20">
        {/* Wallet Management Section */}
        <ErrorBoundary>
          <div className="mb-12">
            <WalletList
              profileUserId={user.id}
              wallets={wallets.map(w => ({
                id: w.id,
                address: w.address,
                isPrimary: w.isPrimary,
                label: w.label,
              }))}
            />
          </div>
        </ErrorBoundary>

        <div className="flex items-end justify-between mb-8 border-b-2 border-dark/20 pb-4">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock text-dark">Token History</h2>
          <ErrorBoundary>
            <ProfileActions profileUserId={user.id} hasWallets={wallets.length > 0} />
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <Suspense fallback={
            <div className="grid gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border-2 border-dark/20 bg-white p-6 h-48 animate-pulse" />
              ))}
            </div>
          }>
            <div className="grid gap-6">
              {tokens.map((token) => (
                <TokenCard key={token.mint} token={token} />
              ))}

              {tokens.length === 0 && (
                <div className="border-2 border-dashed border-dark/30 bg-white p-10 md:p-16 text-center">
                  <div className="w-16 h-16 bg-accent/10 border-2 border-dashed border-accent/30 mx-auto mb-6 flex items-center justify-center">
                    <Wallet size={28} className="text-accent/50" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black font-display-mock mb-3 text-dark">No Token Launches Yet</h3>
                  <p className="text-dark/60 mb-6 max-w-md mx-auto">
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
