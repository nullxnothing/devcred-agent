'use client';

import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import bs58 from 'bs58';
import { Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useWalletAuth } from '@/components/providers/AuthProvider';

type VerificationStatus = 'idle' | 'connecting' | 'signing' | 'verifying' | 'success' | 'error';

interface WalletConnectProps {
  onVerificationComplete?: (walletAddress: string) => void;
  className?: string;
}

export function WalletConnect({ onVerificationComplete, className = '' }: WalletConnectProps) {
  const { user } = useWalletAuth();
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const [status, setStatus] = useState<VerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleVerify = useCallback(async () => {
    if (!publicKey || !signMessage || !user?.id) {
      setError('Please connect your wallet and sign in first.');
      return;
    }

    setStatus('signing');
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();

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

      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      setStatus('verifying');

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
        if (err.message.includes('User rejected')) {
          setError('Signature request was rejected. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    }
  }, [publicKey, signMessage, user, onVerificationComplete]);

  const handleDisconnect = useCallback(() => {
    disconnect();
    setStatus('idle');
    setVerifiedAddress(null);
    setError(null);
  }, [disconnect]);

  if (!user) {
    return (
      <div className={`p-6 border-2 border-white/20 bg-black-2 ${className}`}>
        <div className="flex items-center gap-3 text-white-60">
          <AlertCircle size={20} />
          <span className="text-sm font-medium">Sign in to verify your wallet</span>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className={`p-6 border-2 border-white/20 bg-black-2 ${className}`}>
        <button
          onClick={handleConnect}
          className="flex items-center gap-3 w-full justify-center py-3 px-6 bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
        >
          <Wallet size={20} />
          Connect Wallet
        </button>
        <p className="text-xs text-white-60 text-center mt-3">
          Connect your Solana wallet to verify ownership
        </p>
      </div>
    );
  }

  if (status !== 'success' && !verifiedAddress) {
    return (
      <div className={`p-6 border-2 border-white/20 bg-black-2 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="text-sm font-mono truncate max-w-[200px] text-white">
              {publicKey?.toBase58()}
            </span>
          </div>
          <button
            onClick={handleDisconnect}
            className="text-xs text-white-60 hover:text-white underline"
          >
            Disconnect
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error-light border border-error-border text-error text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={status === 'signing' || status === 'verifying'}
          className="flex items-center gap-3 w-full justify-center py-3 px-6 bg-white text-black font-bold uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        <p className="text-xs text-white-60 text-center mt-3">
          Sign a message to prove wallet ownership. This is free and secure.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 border-2 border-success-border bg-success-light ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <CheckCircle size={24} className="text-success" />
        <span className="font-bold text-success">Wallet Verified</span>
      </div>
      <div className="font-mono text-sm text-success/80 truncate">
        {verifiedAddress || publicKey?.toBase58()}
      </div>
      <button
        onClick={handleDisconnect}
        className="mt-4 text-xs text-success/60 hover:text-success underline"
      >
        Disconnect & Remove
      </button>
    </div>
  );
}
