'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareButtonProps {
  handle: string;
  score: number;
  tierName: string;
  tierColor?: string;
  rank?: number | null;
  tokenCount?: number;
  migratedCount?: number;
  avatarUrl?: string;
  walletAddress?: string;
  twitterName?: string;
}

export function ShareButton({
  handle,
  score,
  tierName,
  rank,
  tokenCount,
  migratedCount,
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/profile/${encodeURIComponent(handle)}`
    : `/profile/${encodeURIComponent(handle)}`;

  const rankText = rank ? ` | Rank #${rank}` : '';
  const launchText = tokenCount ? ` | ${tokenCount} launches` : '';
  const migratedText = migratedCount ? ` (${migratedCount} migrated)` : '';
  const shareText = `My DevKarma Score: ${score} (${tierName})${rankText}${launchText}${migratedText}\n\nCheck your developer reputation on @devkarma_io`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = profileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `DevKarma Profile - ${handle}`,
          text: shareText,
          url: profileUrl,
        });
      } catch {
        // User cancelled or error
      }
    }
    setShowMenu(false);
  };

  return (
    <div className="relative">
      <Button
        variant="accent"
        className="flex-1 md:flex-none"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Share2 size={18} /> Share Profile
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-card border-2 border-border shadow-[4px_4px_0px_0px_var(--border)] z-50">
            <div className="p-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/10 transition-colors text-dark"
              >
                {copied ? (
                  <Check size={18} className="text-success" />
                ) : (
                  <Copy size={18} className="text-dark" />
                )}
                <span className="font-semibold text-sm text-dark">
                  {copied ? 'Copied!' : 'Copy Link'}
                </span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/10 transition-colors text-dark"
                >
                  <Share2 size={18} className="text-dark" />
                  <span className="font-semibold text-sm text-dark">More Options...</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
