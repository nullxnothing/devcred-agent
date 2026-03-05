'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2, CheckCircle, AlertCircle, Unlink } from 'lucide-react';
import { useWalletAuth } from '@/components/providers/AuthProvider';

interface TwitterLinkProps {
  profileUserId: string;
  currentTwitterHandle?: string | null;
  currentAvatarUrl?: string | null;
  onLinked?: () => void;
}

export function TwitterLink({
  profileUserId,
  currentTwitterHandle,
  currentAvatarUrl,
  onLinked
}: TwitterLinkProps) {
  const { user, loading: authLoading } = useWalletAuth();
  const [loading, setLoading] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOwnProfile = user?.id === profileUserId;

  // Check URL for Twitter callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const twitterLinked = params.get('twitter_linked');
    const twitterError = params.get('twitter_error');

    if (twitterLinked === 'true') {
      setSuccess('X account linked successfully!');
      onLinked?.();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (twitterError) {
      setError(decodeURIComponent(twitterError));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onLinked]);

  // Don't show while loading auth or if not own profile
  if (authLoading || !isOwnProfile) return null;

  const handleLinkTwitter = async () => {
    setLoading(true);
    setError(null);

    try {
      // Store current user ID in session storage for the callback
      sessionStorage.setItem('link_twitter_user_id', profileUserId);

      // Redirect to Twitter OAuth - the callback will handle linking
      await signIn('twitter', {
        callbackUrl: '/api/auth/twitter-link/callback',
        redirect: true,
      });
    } catch (err) {
      setError('Failed to initiate Twitter authentication');
      setLoading(false);
    }
  };

  const handleUnlinkTwitter = async () => {
    if (!confirm('Are you sure you want to unlink your X account?')) return;

    setUnlinking(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/twitter-link', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unlink X account');
      }

      setSuccess('X account unlinked');
      onLinked?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink');
    } finally {
      setUnlinking(false);
    }
  };

  // Already linked state
  if (currentTwitterHandle) {
    return (
      <div className="border-2 border-white/20 bg-black-2 p-4">
        <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2 text-white">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          X Account
        </h3>

        {error && (
          <div className="mb-3 p-2 bg-error-light border border-error-border text-error text-xs flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-3 p-2 bg-success-light border border-success-border text-success text-xs flex items-center gap-2">
            <CheckCircle size={14} />
            {success}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentAvatarUrl && (
              <img
                src={currentAvatarUrl}
                alt=""
                className="w-10 h-10 rounded-full border-2 border-white/10"
              />
            )}
            <div>
              <a
                href={`https://x.com/${currentTwitterHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-white hover:text-white transition-colors"
              >
                @{currentTwitterHandle}
              </a>
              <div className="text-xs text-success flex items-center gap-1">
                <CheckCircle size={12} />
                Linked
              </div>
            </div>
          </div>

          <button
            onClick={handleUnlinkTwitter}
            disabled={unlinking}
            className="text-xs text-error hover:text-error/80 flex items-center gap-1 disabled:opacity-50"
          >
            {unlinking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <>
                <Unlink size={14} />
                Unlink
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Not linked state
  return (
    <div className="border-2 border-white/20 bg-black-2 p-4">
      <h3 className="font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2 text-white">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Link X Account
      </h3>

      {error && (
        <div className="mb-3 p-2 bg-error-light border border-error-border text-error text-xs flex items-center gap-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <p className="text-white-60 text-sm mb-4">
        Link your X account to display your profile picture and handle in the extension.
      </p>

      <button
        onClick={handleLinkTwitter}
        disabled={loading}
        className="w-full h-10 bg-white text-black font-bold uppercase text-xs tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            Connect X Account
          </>
        )}
      </button>
    </div>
  );
}
