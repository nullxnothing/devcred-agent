'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { ClaimLaunchModal } from './ClaimLaunchModal';
import { useWalletAuth } from '@/components/providers/AuthProvider';

interface ProfileActionsProps {
  profileUserId: string;
  hasWallets: boolean;
}

export function ProfileActions({ profileUserId, hasWallets }: ProfileActionsProps) {
  const { user } = useWalletAuth();
  const router = useRouter();
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const isOwnProfile = user?.id === profileUserId;

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
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowWalletConnect(false)}
          />
          <div className="relative w-full max-w-md">
            <WalletConnect
              onVerificationComplete={handleWalletVerified}
              className=""
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
  const { user } = useWalletAuth();
  const router = useRouter();
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  const isOwnProfile = user?.id === profileUserId;

  const handleWalletVerified = useCallback((walletAddress: string) => {
    router.refresh();
    setShowWalletConnect(false);
  }, [router]);

  // If not logged in, show link to login
  if (!user) {
    return (
      <button
        onClick={() => router.push('/login')}
        className="mt-4 text-white font-bold underline hover:text-white/80 transition-colors"
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
        className="mt-4 text-white font-bold underline hover:text-white/80 transition-colors"
      >
        Connect a wallet to scan
      </button>

      {/* Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowWalletConnect(false)}
          />
          <div className="relative w-full max-w-md">
            <WalletConnect
              onVerificationComplete={handleWalletVerified}
              className=""
            />
          </div>
        </div>
      )}
    </>
  );
}
