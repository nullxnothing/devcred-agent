import { Wallet } from 'lucide-react';
import { getProfileTokens } from '@/lib/data-fetching';
import { TokenCard } from './TokenCard';
import { ConnectWalletButton } from './ProfileActions';
import { AutoScanTrigger } from './AutoScanTrigger';

interface TokenListStreamingProps {
  userId: string;
  wallets: Array<{ address: string }>;
}

export async function TokenListStreaming({ userId, wallets }: TokenListStreamingProps) {
  // Disable auto-scan to prevent timeout on first visit - user must manually trigger scan
  const { tokens } = await getProfileTokens(userId, wallets, { scanIfEmpty: false });

  if (tokens.length === 0) {
    const primaryWallet = wallets[0]?.address;
    
    return (
      <>
        <AutoScanTrigger
          userId={userId}
          walletAddress={primaryWallet}
          hasTokens={false}
        />
        <div className="border-2 border-dashed border-white-20 bg-black-2 p-6 sm:p-10 md:p-16 text-center mt-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 border-2 border-dashed border-white/30 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
            <Wallet size={24} className="text-white/50 sm:w-7 sm:h-7" />
          </div>
          <h3 className="text-lg sm:text-xl md:text-2xl font-black font-mono font-extrabold uppercase mb-2 sm:mb-3 text-white">No Token Launches Yet</h3>
          <p className="text-sm sm:text-base text-white-60 mb-4 sm:mb-6 max-w-md mx-auto">
            Connect a wallet to scan your token launch history and build your reputation.
          </p>
          <ConnectWalletButton profileUserId={userId} />
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-4 sm:gap-6">
      {tokens.map((token) => (
        <TokenCard key={token.mint} token={token} />
      ))}
    </div>
  );
}

export function TokenListSkeleton() {
  return (
    <div className="grid gap-4 sm:gap-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="border-2 border-white-20 bg-black-2 p-4 sm:p-6 h-32 sm:h-48 animate-pulse" />
      ))}
    </div>
  );
}
