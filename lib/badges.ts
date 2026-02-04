/**
 * Badge System for DevKarma
 * 
 * Calculates achievement badges based on token performance metrics.
 * Badges are displayed on profile "calling cards" and can be hovered/tapped
 * to see token details.
 */

export type BadgeType = 
  | 'ath_10k' | 'ath_50k' | 'ath_100k' | 'ath_500k' | 'ath_1m' | 'ath_10m'
  | 'migrated' | 'first_migration'
  | 'holders_100' | 'holders_500' | 'holders_1k' | 'holders_5k'
  | 'elite_launch' | 'strong_launch'
  | 'diamond_hands'
  | 'multi_launcher';

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Badge {
  type: BadgeType;
  tier: BadgeTier;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  tokenMint?: string;
  tokenName?: string;
  tokenSymbol?: string;
  value?: number; // The actual value that earned the badge (e.g., ATH amount)
  earnedAt?: Date;
}

export interface TokenForBadges {
  mint: string;
  name: string;
  symbol: string;
  athMarketCap?: number | null;
  migrated?: boolean;
  migratedAt?: string | null;
  holderCount?: number | null;
  score?: number;
  devHoldingPercent?: number | null;
  launchDate?: string;
}

// ATH Market Cap thresholds
const ATH_THRESHOLDS = {
  TIER_1: 10_000,      // $10K - Bronze
  TIER_2: 50_000,      // $50K - Silver  
  TIER_3: 100_000,     // $100K - Gold
  TIER_4: 500_000,     // $500K - Platinum
  TIER_5: 1_000_000,   // $1M - Diamond
  TIER_6: 10_000_000,  // $10M - Diamond (legendary)
} as const;

// Holder count thresholds
const HOLDER_THRESHOLDS = {
  TIER_1: 100,   // Bronze
  TIER_2: 500,   // Silver
  TIER_3: 1000,  // Gold
  TIER_4: 5000,  // Platinum
} as const;

// Token score thresholds for launch quality badges
const SCORE_THRESHOLDS = {
  STRONG: 75,  // Silver
  ELITE: 90,   // Gold
} as const;

/**
 * Badge definitions with styling metadata
 */
export const BADGE_DEFINITIONS: Record<BadgeType, {
  label: string;
  description: string;
  icon: string;
  tier: BadgeTier;
}> = {
  // ATH badges (ascending tiers)
  ath_10k: {
    label: '$10K ATH',
    description: 'Token reached $10,000 market cap',
    icon: 'Coins',
    tier: 'bronze',
  },
  ath_50k: {
    label: '$50K ATH',
    description: 'Token reached $50,000 market cap',
    icon: 'TrendingUp',
    tier: 'silver',
  },
  ath_100k: {
    label: '$100K ATH',
    description: 'Token reached $100,000 market cap',
    icon: 'Rocket',
    tier: 'gold',
  },
  ath_500k: {
    label: '$500K ATH',
    description: 'Token reached $500,000 market cap',
    icon: 'Flame',
    tier: 'platinum',
  },
  ath_1m: {
    label: '$1M ATH',
    description: 'Token reached $1,000,000 market cap',
    icon: 'Gem',
    tier: 'diamond',
  },
  ath_10m: {
    label: '$10M ATH',
    description: 'Token reached $10,000,000 market cap',
    icon: 'Crown',
    tier: 'diamond',
  },

  // Migration badges
  migrated: {
    label: 'Migrated',
    description: 'Token successfully migrated to DEX',
    icon: 'Plane',
    tier: 'silver',
  },
  first_migration: {
    label: 'First Migration',
    description: 'Your first successful DEX migration',
    icon: 'Award',
    tier: 'gold',
  },

  // Holder badges
  holders_100: {
    label: '100 Holders',
    description: 'Token reached 100 unique holders',
    icon: 'Users',
    tier: 'bronze',
  },
  holders_500: {
    label: '500 Holders',
    description: 'Token reached 500 unique holders',
    icon: 'Users',
    tier: 'silver',
  },
  holders_1k: {
    label: '1K Holders',
    description: 'Token reached 1,000 unique holders',
    icon: 'Users',
    tier: 'gold',
  },
  holders_5k: {
    label: '5K Holders',
    description: 'Token reached 5,000 unique holders',
    icon: 'Users',
    tier: 'platinum',
  },

  // Launch quality badges
  strong_launch: {
    label: 'Strong Launch',
    description: 'Token achieved a score of 75+',
    icon: 'Zap',
    tier: 'silver',
  },
  elite_launch: {
    label: 'Elite Launch',
    description: 'Token achieved a score of 90+',
    icon: 'Trophy',
    tier: 'gold',
  },

  // Special badges
  diamond_hands: {
    label: 'Diamond Hands',
    description: 'Developer held significant stake through volatility',
    icon: 'Diamond',
    tier: 'platinum',
  },
  multi_launcher: {
    label: 'Serial Builder',
    description: 'Successfully launched 5+ tokens',
    icon: 'Layers',
    tier: 'gold',
  },
};

/**
 * Tier styling configuration - DevKarma brand aligned
 * Uses sharp edges and brand-consistent colors
 */
export const TIER_STYLES: Record<BadgeTier, {
  bg: string;
  border: string;
  shadow: string;
  textColor: string;
  labelColor: string;
  valueColor: string;
  // Legacy gradient support
  gradient: string;
}> = {
  bronze: {
    bg: 'bg-amber-800',
    border: 'border-amber-600',
    shadow: 'shadow-[2px_2px_0px_0px_rgba(180,83,9,0.5)]',
    textColor: 'text-amber-100',
    labelColor: 'text-amber-700',
    valueColor: 'text-amber-700',
    gradient: 'from-amber-800 to-amber-700',
  },
  silver: {
    bg: 'bg-slate-500',
    border: 'border-slate-400',
    shadow: 'shadow-[2px_2px_0px_0px_rgba(100,116,139,0.5)]',
    textColor: 'text-slate-100',
    labelColor: 'text-slate-500',
    valueColor: 'text-slate-600',
    gradient: 'from-slate-500 to-slate-400',
  },
  gold: {
    bg: 'bg-score-legend',
    border: 'border-yellow-500',
    shadow: 'shadow-[2px_2px_0px_0px_rgba(234,179,8,0.6)]',
    textColor: 'text-yellow-950',
    labelColor: 'text-yellow-600',
    valueColor: 'text-yellow-600',
    gradient: 'from-yellow-400 to-yellow-500',
  },
  platinum: {
    bg: 'bg-emerald-600',
    border: 'border-emerald-400',
    shadow: 'shadow-[2px_2px_0px_0px_rgba(16,185,129,0.5)]',
    textColor: 'text-emerald-50',
    labelColor: 'text-emerald-600',
    valueColor: 'text-emerald-600',
    gradient: 'from-emerald-500 to-emerald-400',
  },
  diamond: {
    bg: 'bg-score-elite',
    border: 'border-purple-400',
    shadow: 'shadow-[2px_2px_0px_0px_rgba(168,85,247,0.6)]',
    textColor: 'text-purple-50',
    labelColor: 'text-purple-500',
    valueColor: 'text-purple-600',
    gradient: 'from-purple-500 to-purple-400',
  },
};

/**
 * Calculate the highest ATH badge for a token
 */
function getAthBadge(token: TokenForBadges): Badge | null {
  const ath = token.athMarketCap;
  if (!ath || ath < ATH_THRESHOLDS.TIER_1) return null;

  let badgeType: BadgeType;
  if (ath >= ATH_THRESHOLDS.TIER_6) {
    badgeType = 'ath_10m';
  } else if (ath >= ATH_THRESHOLDS.TIER_5) {
    badgeType = 'ath_1m';
  } else if (ath >= ATH_THRESHOLDS.TIER_4) {
    badgeType = 'ath_500k';
  } else if (ath >= ATH_THRESHOLDS.TIER_3) {
    badgeType = 'ath_100k';
  } else if (ath >= ATH_THRESHOLDS.TIER_2) {
    badgeType = 'ath_50k';
  } else {
    badgeType = 'ath_10k';
  }

  const def = BADGE_DEFINITIONS[badgeType];
  return {
    type: badgeType,
    tier: def.tier,
    label: def.label,
    description: def.description,
    icon: def.icon,
    tokenMint: token.mint,
    tokenName: token.name,
    tokenSymbol: token.symbol,
    value: ath,
  };
}

/**
 * Calculate holder badge for a token
 */
function getHolderBadge(token: TokenForBadges): Badge | null {
  const holders = token.holderCount;
  if (!holders || holders < HOLDER_THRESHOLDS.TIER_1) return null;

  let badgeType: BadgeType;
  if (holders >= HOLDER_THRESHOLDS.TIER_4) {
    badgeType = 'holders_5k';
  } else if (holders >= HOLDER_THRESHOLDS.TIER_3) {
    badgeType = 'holders_1k';
  } else if (holders >= HOLDER_THRESHOLDS.TIER_2) {
    badgeType = 'holders_500';
  } else {
    badgeType = 'holders_100';
  }

  const def = BADGE_DEFINITIONS[badgeType];
  return {
    type: badgeType,
    tier: def.tier,
    label: def.label,
    description: def.description,
    icon: def.icon,
    tokenMint: token.mint,
    tokenName: token.name,
    tokenSymbol: token.symbol,
    value: holders,
  };
}

/**
 * Calculate launch quality badge for a token
 */
function getLaunchQualityBadge(token: TokenForBadges): Badge | null {
  const score = token.score;
  if (!score) return null;

  let badgeType: BadgeType | null = null;
  if (score >= SCORE_THRESHOLDS.ELITE) {
    badgeType = 'elite_launch';
  } else if (score >= SCORE_THRESHOLDS.STRONG) {
    badgeType = 'strong_launch';
  }

  if (!badgeType) return null;

  const def = BADGE_DEFINITIONS[badgeType];
  return {
    type: badgeType,
    tier: def.tier,
    label: def.label,
    description: def.description,
    icon: def.icon,
    tokenMint: token.mint,
    tokenName: token.name,
    tokenSymbol: token.symbol,
    value: score,
  };
}

/**
 * Calculate all badges for a user based on their token history
 */
export function calculateBadges(tokens: TokenForBadges[]): Badge[] {
  const badges: Badge[] = [];
  const migratedTokens = tokens.filter(t => t.migrated);
  let firstMigrationAdded = false;

  for (const token of tokens) {
    // ATH badge (only highest per token)
    const athBadge = getAthBadge(token);
    if (athBadge) badges.push(athBadge);

    // Holder badge (only highest per token)
    const holderBadge = getHolderBadge(token);
    if (holderBadge) badges.push(holderBadge);

    // Launch quality badge
    const qualityBadge = getLaunchQualityBadge(token);
    if (qualityBadge) badges.push(qualityBadge);

    // Migration badge
    if (token.migrated) {
      // First migration is special
      if (!firstMigrationAdded && migratedTokens.length > 0) {
        const def = BADGE_DEFINITIONS.first_migration;
        badges.push({
          type: 'first_migration',
          tier: def.tier,
          label: def.label,
          description: def.description,
          icon: def.icon,
          tokenMint: migratedTokens[0].mint,
          tokenName: migratedTokens[0].name,
          tokenSymbol: migratedTokens[0].symbol,
          earnedAt: migratedTokens[0].migratedAt ? new Date(migratedTokens[0].migratedAt) : undefined,
        });
        firstMigrationAdded = true;
      }

      // Regular migration badge for each migrated token
      const def = BADGE_DEFINITIONS.migrated;
      badges.push({
        type: 'migrated',
        tier: def.tier,
        label: def.label,
        description: def.description,
        icon: def.icon,
        tokenMint: token.mint,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        earnedAt: token.migratedAt ? new Date(token.migratedAt) : undefined,
      });
    }
  }

  // Multi-launcher badge (5+ tokens)
  if (tokens.length >= 5) {
    const def = BADGE_DEFINITIONS.multi_launcher;
    badges.push({
      type: 'multi_launcher',
      tier: def.tier,
      label: def.label,
      description: def.description,
      icon: def.icon,
      value: tokens.length,
    });
  }

  return badges;
}

/**
 * Get unique badges (deduplicated by type, keeping highest value)
 */
export function getUniqueBadges(badges: Badge[]): Badge[] {
  const badgeMap = new Map<BadgeType, Badge>();

  for (const badge of badges) {
    const existing = badgeMap.get(badge.type);
    if (!existing || (badge.value && existing.value && badge.value > existing.value)) {
      badgeMap.set(badge.type, badge);
    }
  }

  return Array.from(badgeMap.values());
}

/**
 * Get top badges sorted by tier (diamond first) then by value
 */
export function getTopBadges(badges: Badge[], limit = 6): Badge[] {
  const tierOrder: Record<BadgeTier, number> = {
    diamond: 5,
    platinum: 4,
    gold: 3,
    silver: 2,
    bronze: 1,
  };

  return [...badges]
    .sort((a, b) => {
      // Sort by tier first
      const tierDiff = tierOrder[b.tier] - tierOrder[a.tier];
      if (tierDiff !== 0) return tierDiff;
      // Then by value (higher is better)
      return (b.value || 0) - (a.value || 0);
    })
    .slice(0, limit);
}

/**
 * Format badge value for display
 */
export function formatBadgeValue(badge: Badge): string {
  if (!badge.value) return '';

  if (badge.type.startsWith('ath_')) {
    if (badge.value >= 1_000_000) {
      return `$${(badge.value / 1_000_000).toFixed(1)}M`;
    }
    if (badge.value >= 1_000) {
      return `$${(badge.value / 1_000).toFixed(0)}K`;
    }
    return `$${badge.value.toFixed(0)}`;
  }

  if (badge.type.startsWith('holders_')) {
    if (badge.value >= 1_000) {
      return `${(badge.value / 1_000).toFixed(1)}K`;
    }
    return badge.value.toString();
  }

  return badge.value.toString();
}
