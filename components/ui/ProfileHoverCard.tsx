'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Award } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { TierBadge } from '@/components/ui/TierBadge';
import { AchievementBadge } from '@/components/ui/AchievementBadge';
import { calculateBadges, getTopBadges, getUniqueBadges, TokenForBadges, Badge } from '@/lib/badges';
import { getDevScoreColor } from '@/lib/score-colors';

interface ProfileHoverCardProps {
  twitterHandle: string | null;
  twitterName: string | null;
  avatarUrl: string | null;
  score: number;
  tier: string;
  tierName: string;
  tierColor: string;
  rank?: number | null;
  primaryWallet?: string | null;
  children: React.ReactNode;
}

export function ProfileHoverCard({
  twitterHandle,
  twitterName,
  avatarUrl,
  score,
  tier,
  tierName,
  tierColor,
  rank,
  primaryWallet,
  children,
}: ProfileHoverCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scoreColor = getDevScoreColor(score);
  
  // Profile identifier for links and API calls
  const profileIdentifier = twitterHandle || primaryWallet || '';
  const displayName = twitterName || (primaryWallet ? `Dev ${primaryWallet.slice(0, 4)}...${primaryWallet.slice(-4)}` : 'Unknown Dev');
  const displayHandle = twitterHandle ? `@${twitterHandle}` : (primaryWallet ? `${primaryWallet.slice(0, 8)}...` : '');

  // Fetch badges on first hover
  const fetchBadges = useCallback(async () => {
    if (hasFetched || !profileIdentifier) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/profile/${encodeURIComponent(profileIdentifier)}/badges`);
      if (response.ok) {
        const data = await response.json();
        if (data.tokens && Array.isArray(data.tokens)) {
          const allBadges = calculateBadges(data.tokens as TokenForBadges[]);
          const uniqueBadges = getUniqueBadges(allBadges);
          const topBadges = getTopBadges(uniqueBadges, 6);
          setBadges(topBadges);
        }
      }
    } catch (error) {
      console.error('Failed to fetch badges:', error);
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [profileIdentifier, hasFetched]);

  const handleMouseEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }

    hoverTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const cardWidth = 320;
        const cardHeight = 340;
        
        // Calculate optimal position
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceRight = window.innerWidth - rect.left;
        
        // Position card below or above
        const top = spaceBelow > cardHeight + 20 
          ? rect.height + 8 
          : -(cardHeight + 8);
        
        // Position card horizontally - centered under the name/avatar area
        let left = 120; // Offset to align with developer name area
        if (spaceRight < cardWidth + 150) {
          // Not enough space on right, align more to center
          left = Math.max(20, (rect.width - cardWidth) / 2);
        }
        
        setCardStyle({
          top: `${top}px`,
          left: `${left}px`,
        });
      }
      setIsVisible(true);
      fetchBadges();
    }, 350);
  }, [fetchBadges]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    leaveTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 200);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative block w-full"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {/* Hover Card */}
      {isVisible && (
        <div 
          ref={cardRef}
          className="absolute z-[100] w-80 bg-black-2 border-2 border-white-20 shadow-2xl overflow-hidden"
          style={cardStyle}
          onMouseEnter={() => {
            if (leaveTimeoutRef.current) {
              clearTimeout(leaveTimeoutRef.current);
              leaveTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleMouseLeave}
        >
          {/* Decorative top bar */}
          <div className="h-1 bg-gradient-to-r from-white via-white/40 to-white" />
          
          {/* Header */}
          <div className="p-4 border-b border-white-20">
            <div className="flex items-start gap-3">
              <Avatar
                src={avatarUrl}
                alt={displayName}
                size="lg"
                className="border-2 border-white/50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg leading-tight truncate">
                  {displayName}
                </h3>
                <p className="text-white-40 text-sm font-mono truncate">
                  {displayHandle}
                </p>
                <div className="mt-2">
                  <TierBadge
                    tier={tier}
                    tierName={tierName}
                    tierColor={tierColor}
                    size="sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Score + Rank */}
          <div className="px-4 py-3 bg-black flex items-center justify-between border-b border-white-20">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-white-40 mb-0.5">
                Blacklist Score
              </div>
              <div className={`text-3xl font-mono font-bold ${scoreColor.textClass}`}>
                {score}
              </div>
            </div>
            {rank && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-white-40 mb-0.5">
                  Rank
                </div>
                <div className="text-3xl font-mono font-bold text-white">
                  #{rank}
                </div>
              </div>
            )}
          </div>

          {/* Badges Section */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-3">
              <Award size={14} className="text-white" />
              <span className="text-[10px] uppercase tracking-wider text-white-40 font-bold">
                Achievements
              </span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className="animate-spin text-white" />
              </div>
            ) : badges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {badges.map((badge, index) => (
                  <AchievementBadge
                    key={`${badge.type}-${badge.tokenMint || index}`}
                    badge={badge}
                    size="sm"
                    showTooltip={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-white-40 text-sm italic py-4 text-center">
                No achievements earned yet
              </p>
            )}
          </div>

          {/* View Profile Link */}
          <Link
            href={`/profile/${encodeURIComponent(profileIdentifier)}`}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-black hover:bg-white/10 border-t border-white-20 text-white-40 hover:text-white text-sm font-bold uppercase tracking-wide transition-colors"
          >
            View Full Profile
            <ExternalLink size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}

export default ProfileHoverCard;
