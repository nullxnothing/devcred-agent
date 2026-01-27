import { notFound } from 'next/navigation';
import { Wallet, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getProfileData } from '@/lib/data-fetching';
import { ProfileActions, ConnectWalletButton, ShareButton } from '@/components/profile';

interface ProfilePageProps {
  params: Promise<{ handle: string }>;
}

function formatMarketCap(value: number | null): string {
  if (!value) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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

  return (
    <div className="min-h-screen">
      {/* Profile Header */}
      <div className="bg-dark text-cream p-6 md:p-12 lg:p-20 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 p-12 opacity-10 font-display-mock text-[20rem] leading-none pointer-events-none select-none text-cream">
          {score.total}
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between mb-12">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.avatarUrl || '/default-avatar.png'}
                alt="Profile"
                className="w-32 h-32 md:w-40 md:h-40 border-4 border-cream object-cover bg-gray-700"
              />
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl font-black font-display-mock tracking-tight">
                    {user.twitterName}
                  </h1>
                  {user.isVerified && (
                    <div className="bg-accent text-dark px-2 py-0.5 text-xs font-bold uppercase">Verified</div>
                  )}
                </div>
                <div className="font-mono text-cream/60 mb-4 flex items-center gap-2">
                  <Wallet size={16} />
                  {primaryWallet?.address || 'No wallet linked'}
                </div>
                <div className="flex gap-2">
                  <span
                    className="px-3 py-1 border border-cream/20 text-xs font-bold uppercase"
                    style={{ backgroundColor: score.tierColor + '20', borderColor: score.tierColor }}
                  >
                    {score.tierName}
                  </span>
                  {stats.migratedTokens > 0 && (
                    <span className="px-3 py-1 bg-cream/10 border border-cream/20 text-xs font-bold uppercase">
                      {stats.migratedTokens} Migrations
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
              <ShareButton handle={user.twitterHandle} score={score.total} tierName={score.tierName} />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-t border-cream/20 pt-8">
            <div>
              <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Total Score</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock text-accent">{score.total}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Rank</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock">
                {user.rank ? `#${user.rank}` : '-'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Launches</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock">{stats.totalTokens}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-cream/60 mb-1">Reputation</div>
              <div className="text-4xl md:text-5xl font-black font-display-mock">{score.tierName}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto p-6 md:p-12 lg:p-20">
        <div className="flex items-end justify-between mb-8 border-b-2 border-dark pb-4">
          <h2 className="text-3xl md:text-4xl font-black font-display-mock">Token History</h2>
          <ProfileActions profileUserId={user.id} hasWallets={wallets.length > 0} />
        </div>

        <div className="grid gap-6">
          {tokens.map((token) => (
            <div
              key={token.mint}
              className="border-2 border-dark p-6 hover:translate-x-1 hover:-translate-y-1 transition-transform bg-white shadow-[4px_4px_0px_0px_#3B3B3B]"
            >
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{token.name}</h3>
                    <span className="font-mono text-sm opacity-60">${token.symbol}</span>
                    {token.status === 'active' ? (
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold uppercase border border-green-600 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : token.status === 'rug' ? (
                      <span className="flex items-center gap-1 text-red-500 text-xs font-bold uppercase border border-red-500 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} /> Rug
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-500 text-xs font-bold uppercase border border-gray-500 px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                    {token.migrated && (
                      <span className="flex items-center gap-1 text-accent text-xs font-bold uppercase border border-accent px-2 py-0.5 rounded-full">
                        Migrated
                      </span>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm text-dark/70">
                    <span>Launched: {formatDate(token.launchDate)}</span>
                    <span>MCap: {formatMarketCap(token.marketCap)}</span>
                    <span>Vol: {formatMarketCap(token.volume24h)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-dark/10 pt-4 md:pt-0 md:pl-8">
                  <div className="text-center">
                    <div className="text-xs uppercase font-bold text-dark/40">Token Score</div>
                    <div className="text-3xl font-black font-display-mock text-dark">{token.score}</div>
                  </div>
                  <div className="hidden md:flex w-12 h-12 rounded-full border-2 border-dark items-center justify-center bg-cream">
                    <Shield size={24} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {tokens.length === 0 && (
            <div className="border-2 border-dashed border-dark/30 p-12 text-center rounded-lg">
              <p className="text-lg font-medium opacity-50">No token launches connected yet.</p>
              <ConnectWalletButton profileUserId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
