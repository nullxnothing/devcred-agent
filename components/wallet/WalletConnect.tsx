'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useSession } from 'next-auth/react';
import bs58 from 'bs58';
import { Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type VerificationStatus = 'idle' | 'connecting' | 'signing' | 'verifying' | 'success' | 'error';

interface WalletConnectProps {
  onVerificationComplete?: (walletAddress: string) => void;
  className?: string;
}

export function WalletConnect({ onVerificationComplete, className = '' }: WalletConnectProps) {
  const { data: session } = useSession();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage || !session?.user?.id) {
      setError('Please connect your wallet and sign in with Twitter first.');
      return;
    }

    setStatus('signing');
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

      // Step 1: Request nonce from server
      const nonceResponse = await fetch('/api/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      if (!nonceResponse.ok) {
        const data = await nonceResponse.json();
        throw new Error(data.error || 'Failed to get verification nonce');
      }

      const { message } = await nonceResponse.json();

      // Step 2: Sign the message with wallet
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      setStatus('verifying');

      // Step 3: Send signature to server for verification
      const verifyResponse = await fetch('/api/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || 'Verification failed');
      }

      setStatus('success');
      setVerifiedAddress(walletAddress);
      onVerificationComplete?.(walletAddress);
    } catch (err) {
      setStatus('error');
      if (err instanceof Error) {
        // Handle user rejection
        if (err.message.includes('User rejected')) {
          setError('Signature request was rejected. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    }
  }, [publicKey, signMessage, session, onVerificationComplete]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setStatus('idle');
    setVerifiedAddress(null);
    setError(null);
  }, [disconnect]);

  // Not signed in with Twitter
  if (!session?.user) {
    return (
      <div className={`p-6 border-2 border-dark bg-cream ${className}`}>
        <div className="flex items-center gap-3 text-dark/60">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">Sign in with Twitter to verify your wallet</span>
        </div>
      </div>
    );
  }

  // Wallet not connected
  if (!connected) {
    return (
      <div className={`p-6 border-2 border-dark bg-cream ${className}`}>
        <button
          onClick={handleConnect}
          className="flex items-center gap-3 w-full justify-center py-3 px-6 bg-dark text-cream font-bold uppercase tracking-wider hover:bg-accent hover:text-dark transition-colors"
        >
          <Wallet size={20} />
          Connect Wallet
        </button>
        <p className="text-xs text-dark/60 text-center mt-3">
          Connect your Solana wallet to verify ownership
        </p>
      </div>
    );
  }

  // Wallet connected but not verified
  if (status !== 'success' && !verifiedAddress) {
    return (
      <div className={`p-6 border-2 border-dark bg-cream ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-mono truncate max-w-[200px]">
              {publicKey?.toBase58()}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-dark/60 hover:text-dark underline"
          >
            Disconnect
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={status === 'signing' || status === 'verifying'}
          className="flex items-center gap-3 w-full justify-center py-3 px-6 bg-accent text-dark font-bold uppercase tracking-wider hover:bg-dark hover:text-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'signing' && (
            <>
              <Loader2 size={20} className="animate-spin" />
              Requesting Signature...
            </>
          )}
          {status === 'verifying' && (
            <>
              <Loader2 size={20} className="animate-spin" />
              Verifying...
            </>
          )}
          {(status === 'idle' || status === 'error') && (
            <>
              <CheckCircle size={20} />
              Verify Wallet
            </>
          )}
        </button>

        <p className="text-xs text-dark/60 text-center mt-3">
          Sign a message to prove wallet ownership. This is free and secure.
        </p>
      </div>
    );
  }

  // Wallet verified
  return (
    <div className={`p-6 border-2 border-green-600 bg-green-50 ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <CheckCircle size={24} className="text-green-600" />
        <span className="font-bold text-green-800">Wallet Verified</span>
      </div>
      <div className="font-mono text-sm text-green-700 truncate">
        {verifiedAddress || publicKey?.toBase58()}
      </div>
      <button
        onClick={handleDisconnect}
        className="mt-4 text-xs text-green-700/60 hover:text-green-700 underline"
      >
        Disconnect & Remove
      </button>
    </div>
  );
}
