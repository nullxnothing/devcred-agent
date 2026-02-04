'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Award } from 'lucide-react';
import { AchievementBadge } from '@/components/ui/AchievementBadge';
import { calculateBadges, getTopBadges, getUniqueBadges, TokenForBadges } from '@/lib/badges';

interface BadgeGridProps {
  tokens: TokenForBadges[];
  maxDisplay?: number;
  showExpandButton?: boolean;
  title?: string;
  className?: string;
}

export function BadgeGrid({ 
  tokens, 
  maxDisplay = 6, 
  showExpandButton = true,
  title,
  className = ''
}: BadgeGridProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate all badges from tokens
  const allBadges = calculateBadges(tokens);
  
  // Get unique badges (dedupe by type, keep highest value)
  const uniqueBadges = getUniqueBadges(allBadges);
  
  // Get top badges sorted by tier
  const topBadges = getTopBadges(uniqueBadges, maxDisplay);
  
  // Badges to display based on expanded state
  const displayBadges = isExpanded ? uniqueBadges : topBadges;
  const hasMore = uniqueBadges.length > maxDisplay;

  if (uniqueBadges.length === 0) {
    return null; // Don't render if no badges
  }

  return (
    <div className={`${className}`}>
      {title && (
        <div className="flex items-center gap-2 mb-4">
          <Award size={16} className="text-accent" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted">
            {title}
          </h3>
          <span className="text-xs text-text-muted/60">
            ({uniqueBadges.length})
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        {displayBadges.map((badge, index) => (
          <AchievementBadge 
            key={`${badge.type}-${badge.tokenMint || index}`}
            badge={badge}
            size="md"
          />
        ))}

        {showExpandButton && hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              flex items-center gap-1
              px-3 py-2
              text-xs font-bold uppercase tracking-wider
              text-text-muted hover:text-dark
              bg-surface hover:bg-surface/80
              border border-border
              transition-all duration-200
            "
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={14} />
                +{uniqueBadges.length - maxDisplay} More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact badge display for smaller spaces (e.g., leaderboard rows)
 */
export function BadgeRow({ 
  tokens, 
  maxDisplay = 3 
}: { 
  tokens: TokenForBadges[]; 
  maxDisplay?: number;
}) {
  const allBadges = calculateBadges(tokens);
  const uniqueBadges = getUniqueBadges(allBadges);
  const topBadges = getTopBadges(uniqueBadges, maxDisplay);

  if (topBadges.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {topBadges.map((badge, index) => (
        <AchievementBadge 
          key={`${badge.type}-${badge.tokenMint || index}`}
          badge={badge}
          size="sm"
        />
      ))}
      {uniqueBadges.length > maxDisplay && (
        <span className="text-xs text-text-muted ml-1">
          +{uniqueBadges.length - maxDisplay}
        </span>
      )}
    </div>
  );
}

export default BadgeGrid;
