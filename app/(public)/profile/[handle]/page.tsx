import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { getProfileHeader } from '@/lib/data-fetching';
import { Avatar } from '@/components/ui/Avatar';
import { ProfileActions, ShareButton, TokenListStreaming, TokenListSkeleton, BadgesStreaming, BadgesSkeleton } from '@/components/profile';
import { WalletList } from '@/components/wallet';
import { AddressDisplay } from '@/components/ui/CopyButton';
import { TierBadge } from '@/components/ui/TierBadge';
import { KolBadge } from '@/components/ui/KolBadge';
import { TwitterLink } from '@/components/profile';
import { getDevScoreColor } from '@/lib/score-colors';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Force dynamic rendering - profiles are user-generated and database-dependent
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30; // Increase timeout for wallet scanning

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);
  const profile = await getProfileHeader(decodedHandle);

  if (!profile) {
    return {
      title: 'Subject Not Found | Blacklist',
    };
  }

  const { user, score, wallets, stats } = profile;
  const primaryWallet = wallets.find((w) => w.isPrimary) || wallets[0];

  const displayName = user.twitterName || (primaryWallet?.address ? `Dev ${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-4)}` : 'Unknown Subject');
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
    title: `${displayName} | Blacklist Score: ${score.total}`,
    description: `${displayName} has a Blacklist score of ${score.total} (${score.tierName}). ${stats.totalTokens} token launches, ${stats.migratedTokens} migrations.`,
    openGraph: {
      title: `${displayName} | Blacklist Score: ${score.total}`,
      description: `Blacklist Score: ${score.total} | Tier: ${score.tierName} | ${stats.totalTokens} Launches`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s Blacklist Dossier`,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${user.twitterName} | Blacklist Score: ${score.total}`,
      description: `Blacklist Score: ${score.total} | Tier: ${score.tierName} | ${stats.totalTokens} Launches`,
      images: [ogImageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);

  try {
    // Fast header data with cached score
    const header = await getProfileHeader(decodedHandle);

    if (!header) {
      notFound();
    }

    const { user, score, wallets, stats } = header;
    const primaryWallet = wallets.find((w) => w.isPrimary) || wallets[0];

    const displayName = user.twitterName || (primaryWallet?.address ? `Dev ${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-4)}` : 'Unknown Subject');
    const displayHandle = user.twitterHandle || (primaryWallet?.address ? primaryWallet.address.slice(0, 12) : 'unknown');

  return (
    <div className="min-h-screen bg-black font-mono">
      {/* Profile Header */}
      <div className="px-4 sm:px-6 md:px-12 py-8 sm:py-12 md:py-20 border-b border-white-20 bg-black-1 relative overflow-hidden">
        {/* Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 3px)',
        }} />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Terminal prompt */}
          <div className="text-white-40 text-xs tracking-widest mb-4">$ blacklist --dossier {displayHandle}</div>

          {/* Identity Section */}
          <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
              {/* Avatar */}
              <Avatar
                src={user.avatarUrl?.replace('_normal', '_400x400')}
                alt={displayName}
                size="lg"
                className="border border-white-20 shrink-0 sm:hidden"
                priority
              />
              <Avatar
                src={user.avatarUrl?.replace('_normal', '_400x400')}
                alt={displayName}
                size="xl"
                className="border-2 border-white-20 shrink-0 hidden sm:block"
                priority
              />
              <div className="min-w-0">
                {/* Name Row */}
                <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase tracking-tight text-white truncate max-w-[250px] sm:max-w-none">
                    {displayName}
                  </h1>
                  {user.isKol && <KolBadge size="sm" className="sm:hidden" />}
                  {user.isKol && <KolBadge size="md" className="hidden sm:inline-flex" />}
                  {user.twitterHandle && (
                    <a
                      href={`https://x.com/${user.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white-40 hover:text-white active:text-white transition-colors p-1 -m-1"
                      title={`@${user.twitterHandle} on X`}
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-current" aria-hidden="true">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                </div>

                {/* Wallet Row */}
                <div className="font-mono text-xs sm:text-sm text-white-40 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <Wallet size={12} className="sm:w-3.5 sm:h-3.5" />
                  {wallets.length === 0 ? (
                    'No wallet linked'
                  ) : wallets.length === 1 && primaryWallet ? (
                    <AddressDisplay address={primaryWallet.address} className="text-white-40 hover:text-white" />
                  ) : primaryWallet ? (
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <AddressDisplay address={primaryWallet.address} className="text-white-40 hover:text-white" />
                      <span className="text-white-60 text-[10px] sm:text-xs">+{wallets.length - 1} more</span>
                    </span>
                  ) : null}
                  {primaryWallet && (
                    <a
                      href={`https://pump.fun/profile/${primaryWallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-1.5 sm:px-2 py-0.5 bg-white text-black hover:bg-white-90 active:bg-white-90 text-[9px] sm:text-[10px] font-bold uppercase transition-colors font-mono"
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
                    <span className="px-1.5 sm:px-2 py-0.5 border border-white-20 text-[9px] sm:text-[10px] font-bold uppercase text-white-60 font-mono">
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

          {/* Achievement Badges - Streamed */}
          <ErrorBoundary>
            <Suspense fallback={<BadgesSkeleton />}>
              <BadgesStreaming userId={user.id} wallets={wallets} />
            </Suspense>
          </ErrorBoundary>

          {/* Stats Bar */}
          <div className="border border-white-20 bg-black-2 p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {/* Primary: Score */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white-40 mb-1 font-bold font-mono">BLACKLIST SCORE</div>
                <div className="flex items-end gap-1.5 sm:gap-2">
                  <span className={`text-3xl sm:text-4xl md:text-5xl font-mono font-extrabold ${getDevScoreColor(score.total).textClass}`}>
                    {score.total}
                  </span>
                  <span className="text-white-20 text-[10px] sm:text-xs mb-1.5 sm:mb-2 font-mono">/740</span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 sm:mt-2 h-1 bg-white-20 overflow-hidden">
                  <div
                    className={`h-full ${getDevScoreColor(score.total).bgClass} transition-all`}
                    style={{ width: `${Math.min(100, (score.total / 740) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Rank */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white-40 mb-1 font-bold font-mono">RANK</div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold text-white">
                  {user.rank ? `#${user.rank}` : '-'}
                </span>
              </div>

              {/* Launches */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white-40 mb-1 font-bold font-mono">LAUNCHES</div>
                <span className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold text-white">{stats.totalTokens}</span>
              </div>

              {/* Classification */}
              <div className="flex flex-col">
                <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white-40 mb-1 font-bold font-mono">CLASSIFICATION</div>
                <span className="text-lg sm:text-xl md:text-2xl font-bold uppercase tracking-wide text-white truncate font-mono">{score.tierName}</span>
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

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-white-20 pb-3 sm:pb-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold uppercase text-white">Token History</h2>
          <ErrorBoundary>
            <ProfileActions profileUserId={user.id} hasWallets={wallets.length > 0} />
          </ErrorBoundary>
        </div>

        {/* Token List - Streamed */}
        <ErrorBoundary>
          <Suspense fallback={<TokenListSkeleton />}>
            <TokenListStreaming userId={user.id} wallets={wallets} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
  } catch (error) {
    console.error('[ProfilePage] Error loading profile:', error);
    notFound();
  }
}
