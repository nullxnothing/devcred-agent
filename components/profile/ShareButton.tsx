'use client';

import { useState } from 'react';
import { Share2, Check, Copy, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ShareButtonProps {
  handle: string;
  score: number;
  tierName: string;
}

export function ShareButton({ handle, score, tierName }: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const profileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/profile/${encodeURIComponent(handle)}`
    : `/profile/${encodeURIComponent(handle)}`;

  const shareText = `Check out my DevKarma profile! Score: ${score} | Tier: ${tierName}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
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

  const handleShareTwitter = () => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(profileUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
    setShowMenu(false);
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
          <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-dark shadow-[4px_4px_0px_0px_#3B3B3B] z-50">
            <div className="p-2">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark/10 transition-colors"
              >
                {copied ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <Copy size={18} />
                )}
                <span className="font-medium text-sm">
                  {copied ? 'Copied!' : 'Copy Link'}
                </span>
              </button>

              <button
                onClick={handleShareTwitter}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark/10 transition-colors"
              >
                <Twitter size={18} />
                <span className="font-medium text-sm">Share on Twitter</span>
              </button>

              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark/10 transition-colors"
                >
                  <Share2 size={18} />
                  <span className="font-medium text-sm">More Options...</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
