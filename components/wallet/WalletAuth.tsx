'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import bs58 from 'bs58';
import { Wallet, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { PumpFunUsernameSetup } from '@/components/profile/PumpFunUsernameSetup';

type AuthStatus = 'idle' | 'connecting' | 'signing' | 'verifying' | 'success' | 'error';

interface WalletAuthProps {
  onAuthComplete?: (walletAddress: string, isNewUser: boolean) => void;
  redirectTo?: string;
  className?: string;
}

interface AuthResponse {
  success: boolean;
  message: string;
  userId: string;
  walletAddress: string;
  isNewUser: boolean;
  pumpFunProfile: string;
}

export function WalletAuth({ onAuthComplete, redirectTo = '/dashboard', className = '' }: WalletAuthProps) {
  const router = useRouter();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [authData, setAuthData] = useState<AuthResponse | null>(null);
  const [showUsernameSetup, setShowUsernameSetup] = useState(false);

  // Auto-trigger signing when wallet connects
  useEffect(() => {
    if (connected && publicKey && status === 'connecting') {
      handleSign();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey, status]);

  const handleConnect = useCallback(() => {
    setStatus('connecting');
    setError(null);
    setVisible(true);
  }, [setVisible]);

  const handleSign = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected');
      setStatus('error');
      return;
    }

    setStatus('signing');
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

      // Request nonce from public endpoint
      const nonceResponse = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const nonceData = await nonceResponse.json();
      
      if (!nonceResponse.ok) {
        throw new Error(nonceData.error || 'Failed to get authentication nonce');
      }

      const { message } = nonceData;

      // Sign the message
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      setStatus('verifying');

      // Verify signature and authenticate
      const verifyResponse = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Authentication failed');
      }

      setStatus('success');
      setAuthData(verifyData);
      onAuthComplete?.(walletAddress, verifyData.isNewUser);

      // Show username setup for new users, otherwise redirect
      if (verifyData.isNewUser) {
        setShowUsernameSetup(true);
      } else {
        // Redirect after short delay
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      }
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        if (err.message.includes('User rejected')) {
          setError('Signature request was rejected. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    }
  }, [publicKey, signMessage, onAuthComplete, redirectTo, router]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setStatus('idle');
    setAuthData(null);
    setError(null);
  }, [disconnect]);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  // Success state
  if (status === 'success' && authData) {
    const handleUsernameComplete = () => {
      setTimeout(() => {
        router.push(redirectTo);
      }, 1000);
    };

    const handleUsernameSkip = () => {
      router.push(redirectTo);
    };

    return (
      <div className={`p-6 border-4 border-white-20 bg-black-2 ${className}`}>
        <div className="flex items-center gap-3 text-success mb-4">
          <CheckCircle size={24} />
          <span className="font-bold text-lg">{authData.message}</span>
        </div>
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 text-white-60">
            <Wallet size={16} />
            <span className="font-mono text-sm">
              {authData.walletAddress.slice(0, 8)}...{authData.walletAddress.slice(-8)}
            </span>
          </div>
          <a
            href={authData.pumpFunProfile}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-white hover:underline text-sm"
          >
            View on Pump.fun <ExternalLink size={14} />
          </a>
        </div>

        {showUsernameSetup ? (
          <PumpFunUsernameSetup
            onComplete={handleUsernameComplete}
            onSkip={handleUsernameSkip}
          />
        ) : (
          <p className="mt-4 text-sm text-white/50">Redirecting to dashboard...</p>
        )}
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className={`p-6 border-4 border-white-20 bg-black-2 ${className}`}>
        <div className="flex items-center gap-3 text-error mb-4">
          <AlertCircle size={24} />
          <span className="font-bold">Authentication Failed</span>
        </div>
        <p className="text-white-60 mb-4">{error}</p>
        <button
          onClick={handleRetry}
          className="w-full h-12 bg-white text-black font-bold uppercase tracking-tight hover:bg-white/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Loading states
  if (status === 'connecting' || status === 'signing' || status === 'verifying') {
    const statusMessages = {
      connecting: 'Connecting wallet...',
      signing: 'Please sign the message in your wallet...',
      verifying: 'Verifying signature...',
    };

    return (
      <div className={`p-6 border-4 border-white-20 bg-black-2 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={32} className="animate-spin text-white" />
          <span className="font-bold text-white">{statusMessages[status]}</span>
          {status === 'signing' && (
            <p className="text-sm text-white-60 text-center">
              This signature is free and does not authorize any transaction.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Idle state - show connect button
  return (
    <div className={`p-6 border-4 border-white-20 bg-black-2 ${className}`}>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-16 h-16 bg-white/10 border-2 border-white-20 flex items-center justify-center mb-4">
          <Wallet size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Connect Wallet</h2>
        <p className="text-white-60 text-sm">
          Sign in with your Solana wallet. No password needed.
        </p>
      </div>

      <button
        onClick={handleConnect}
        className="w-full h-14 bg-white text-black font-black uppercase tracking-tight hover:bg-white/90 transition-colors flex items-center justify-center gap-3 border-2 border-white-20"
      >
        <Wallet size={20} />
        Connect Wallet
      </button>

      <p className="mt-4 text-xs text-white/50 text-center">
        Supports Phantom, Solflare, and other Solana wallets
      </p>
    </div>
  );
}
