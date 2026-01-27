'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { ClaimLaunchModal } from './ClaimLaunchModal';

interface ProfileActionsProps {
  profileUserId: string;
  hasWallets: boolean;
}

export function ProfileActions({ profileUserId, hasWallets }: ProfileActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const isOwnProfile = session?.user?.id === profileUserId;

  const handleWalletVerified = useCallback((walletAddress: string) => {
    // Refresh the page to show new wallet data
    router.refresh();
    setShowWalletConnect(false);
  }, [router]);

  const handleTokenClaimed = useCallback(() => {
    // Refresh the page to show the claimed token
    router.refresh();
  }, [router]);

  // Only show actions on own profile
  if (!isOwnProfile) {
    return null;
  }

  return (
    <>
      {/* Claim Launch Button */}
      <Button
        variant="outline"
        className="text-xs py-2 px-4 h-auto"
        onClick={() => setShowClaimModal(true)}
      >
        <Plus size={14} /> Claim Launch
      </Button>

      {/* Claim Launch Modal */}
      <ClaimLaunchModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onClaimed={handleTokenClaimed}
      />

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={() => setShowWalletConnect(false)}
          />
          <div className="relative w-full max-w-md">
            <WalletConnect
              onVerificationComplete={handleWalletVerified}
              className="shadow-[8px_8px_0px_0px_#3B3B3B]"
            />
          </div>
        </div>
      )}
    </>
  );
}

interface ConnectWalletButtonProps {
  profileUserId: string;
}

export function ConnectWalletButton({ profileUserId }: ConnectWalletButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const isOwnProfile = session?.user?.id === profileUserId;

  const handleWalletVerified = useCallback((walletAddress: string) => {
    router.refresh();
    setShowWalletConnect(false);
  }, [router]);

  // If not own profile or not logged in, show link to login
  if (!session) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="mt-4 text-accent font-bold underline hover:text-dark transition-colors"
      >
        Sign in to connect a wallet
      </button>
    );
  }

  if (!isOwnProfile) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowWalletConnect(true)}
        className="mt-4 text-accent font-bold underline hover:text-dark transition-colors"
      >
        Connect a wallet to scan
      </button>

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={() => setShowWalletConnect(false)}
          />
          <div className="relative w-full max-w-md">
            <WalletConnect
              onVerificationComplete={handleWalletVerified}
              className="shadow-[8px_8px_0px_0px_#3B3B3B]"
            />
          </div>
        </div>
      )}
    </>
  );
}
