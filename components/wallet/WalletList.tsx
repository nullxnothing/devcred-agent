'use client';

import { useState, useEffect, useCallback } from 'react';
import { Wallet, Star, Trash2, Plus, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { useWalletAuth } from '@/components/providers/AuthProvider';

interface WalletData {
  id: string;
  address: string;
  label: string | null;
  is_primary: boolean;
  verified_at: string;
}

interface WalletListProps {
  profileUserId: string;
  wallets: Array<{
    id: string;
    address: string;
    isPrimary: boolean;
    label?: string | null;
  }>;
  onWalletsChanged?: () => void;
}

export function WalletList({ profileUserId, wallets: initialWallets, onWalletsChanged }: WalletListProps) {
  const { user, loading: authLoading } = useWalletAuth();
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddWallet, setShowAddWallet] = useState(false);

  const isOwnProfile = user?.id === profileUserId;

  const fetchWallets = useCallback(async () => {
    if (!isOwnProfile) return;

    setLoading(true);
    try {
      const res = await fetch('/api/wallet');
      const data = await res.json();
      if (data.wallets) {
        setWallets(data.wallets);
      }
    } catch (err) {
      console.error('Failed to fetch wallets:', err);
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleSetPrimary = async (walletId: string) => {
    setActionLoading(walletId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/wallet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set primary wallet');
      }

      setSuccess('Primary wallet updated');
      await fetchWallets();
      onWalletsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveWallet = async (walletId: string) => {
    if (!confirm('Are you sure you want to remove this wallet? This will also remove all associated token data.')) {
      return;
    }

    setActionLoading(walletId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/wallet', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove wallet');
      }

      setSuccess('Wallet removed');
      await fetchWallets();
      onWalletsChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handleWalletAdded = useCallback(async () => {
    setShowAddWallet(false);
    setSuccess('Wallet added successfully');
    await fetchWallets();
    onWalletsChanged?.();
  }, [fetchWallets, onWalletsChanged]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // For non-owners, show a simple read-only list
  if (!isOwnProfile) {
    return (
      <div className="border-2 border-dark/30 bg-card p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2 text-dark">
          <Wallet size={16} />
          Linked Wallets ({initialWallets.length})
        </h3>
        <div className="space-y-2">
          {initialWallets.map((wallet) => (
            <div key={wallet.id} className="flex items-center gap-2 font-mono text-sm text-dark">
              {wallet.isPrimary && <Star size={14} className="text-accent" />}
              <span className="truncate">{wallet.address}</span>
            </div>
          ))}
          {initialWallets.length === 0 && (
            <p className="text-dark/50 text-sm">No wallets linked</p>
          )}
        </div>
      </div>
    );
  }

  // Owner view with management capabilities
  return (
    <div className="border-2 border-dark/30 bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-dark">
          <Wallet size={16} />
          Your Wallets ({wallets.length})
        </h3>
        <button
          onClick={() => setShowAddWallet(true)}
          className="flex items-center gap-1 text-xs font-bold uppercase text-accent hover:text-accent/80 transition-colors"
        >
          <Plus size={14} />
          Add Wallet
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error-light border border-error-border text-error text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-success-light border border-success-border text-success text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cream/40" />
        </div>
      ) : (
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center justify-between p-3 bg-cream border border-dark/20 rounded"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {wallet.is_primary ? (
                  <Star size={16} className="text-accent shrink-0" fill="currentColor" />
                ) : (
                  <div className="w-4" />
                )}
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate text-dark" title={wallet.address}>
                    {formatAddress(wallet.address)}
                  </div>
                  {wallet.is_primary && (
                    <span className="text-xs text-accent font-bold uppercase">Primary</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!wallet.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(wallet.id)}
                    disabled={actionLoading === wallet.id}
                    className="text-xs text-dark/60 hover:text-dark underline disabled:opacity-50"
                    title="Set as primary wallet"
                  >
                    {actionLoading === wallet.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      'Set Primary'
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleRemoveWallet(wallet.id)}
                  disabled={actionLoading === wallet.id}
                  className="text-error hover:text-error/80 disabled:opacity-50 p-1"
                  title="Remove wallet"
                >
                  {actionLoading === wallet.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}

          {wallets.length === 0 && (
            <div className="text-center py-8 text-dark/50">
              <Wallet size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No wallets linked yet</p>
              <button
                onClick={() => setShowAddWallet(true)}
                className="mt-2 text-accent font-bold text-sm underline hover:text-accent/80"
              >
                Connect your first wallet
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-dark/80 backdrop-blur-sm"
            onClick={() => setShowAddWallet(false)}
          />
          <div className="relative w-full max-w-md">
            <div className="bg-card border-2 border-border shadow-[8px_8px_0px_0px_var(--border)]">
              <div className="flex items-center justify-between p-4 border-b-2 border-dark/30">
                <h3 className="font-bold uppercase tracking-wider text-dark">Add Another Wallet</h3>
                <button
                  onClick={() => setShowAddWallet(false)}
                  className="text-dark/60 hover:text-dark"
                >
                  ✕
                </button>
              </div>
              <WalletConnect
                onVerificationComplete={handleWalletAdded}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
