'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { X, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ClaimLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimed: () => void;
}

type ClaimStatus = 'idle' | 'searching' | 'found' | 'claiming' | 'success' | 'error';

interface TokenInfo {
  mint: string;
  name: string;
  symbol: string;
  creatorWallet: string;
}

export function ClaimLaunchModal({ isOpen, onClose, onClaimed }: ClaimLaunchModalProps) {
  const { data: session } = useSession();
  const [mintAddress, setMintAddress] = useState('');
  const [status, setStatus] = useState<ClaimStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!mintAddress.trim()) {
      setError('Please enter a token mint address');
      return;
    }

    setStatus('searching');
    setError(null);
    setTokenInfo(null);

    try {
      const response = await fetch(`/api/token/lookup?mint=${encodeURIComponent(mintAddress.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token not found');
      }

      setTokenInfo(data);
      setStatus('found');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to find token');
    }
  };

  const handleClaim = async () => {
    if (!tokenInfo || !session?.user?.id) return;

    setStatus('claiming');
    setError(null);

    try {
      const response = await fetch('/api/token/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintAddress: tokenInfo.mint }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim token');
      }

      setStatus('success');
      setTimeout(() => {
        onClaimed();
        handleClose();
      }, 1500);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to claim token');
    }
  };

  const handleClose = () => {
    setMintAddress('');
    setStatus('idle');
    setError(null);
    setTokenInfo(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-lg bg-white border-2 border-dark shadow-[8px_8px_0px_0px_#3B3B3B]">
        <div className="flex items-center justify-between p-6 border-b-2 border-dark/30">
          <h2 className="text-2xl font-black font-display-mock text-dark">Claim Token Launch</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-accent/10 transition-colors text-dark"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle size={64} className="mx-auto text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-2 text-dark">Token Claimed!</h3>
              <p className="text-dark/60">
                {tokenInfo?.name} has been added to your profile.
              </p>
            </div>
          ) : (
            <>
              <p className="text-dark/70 mb-6">
                Enter the mint address of a token you created to claim it on your profile.
                You must have the creator wallet connected to verify ownership.
              </p>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-dark">
                  Token Mint Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mintAddress}
                    onChange={(e) => setMintAddress(e.target.value)}
                    placeholder="Enter mint address..."
                    className="flex-1 px-4 py-3 border-2 border-dark/30 bg-cream font-mono text-sm text-dark placeholder:text-dark/40 focus:outline-none focus:border-accent"
                    disabled={status === 'searching' || status === 'claiming'}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={status === 'searching' || status === 'claiming'}
                    variant="primary"
                    className="px-4"
                  >
                    {status === 'searching' ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {tokenInfo && status === 'found' && (
                <div className="mb-6 p-4 bg-cream border-2 border-dark/30">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-accent/20 border-2 border-accent/30 flex items-center justify-center font-bold text-dark">
                      {tokenInfo.symbol.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-dark">{tokenInfo.name}</h3>
                      <p className="font-mono text-sm text-dark/60">${tokenInfo.symbol}</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono text-dark/50 break-all">
                    Creator: {tokenInfo.creatorWallet}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                {tokenInfo && (status === 'found' || status === 'claiming') && (
                  <Button
                    onClick={handleClaim}
                    variant="accent"
                    className="flex-1"
                    disabled={status === 'claiming'}
                  >
                    {status === 'claiming' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      'Claim This Token'
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
