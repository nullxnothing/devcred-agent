import { DevTier } from './types';
import { TIER_THRESHOLDS } from './constants';

interface TierMetrics {
  score: number;
  migrationCount: number;
  tokenCount: number;
  walletCount: number;
  accountAgeMonths: number;
  rugCount: number;
  maxAthMarketCap: number;
}

/**
 * Determine dev tier based on score and metrics
 */
export function determineTier(metrics: TierMetrics): DevTier {
  const { score, migrationCount, tokenCount, walletCount, accountAgeMonths, rugCount, maxAthMarketCap } = metrics;

  // Penalized: Has rugs and score below threshold
  if (rugCount > 0 && score < TIER_THRESHOLDS.VERIFIED.minScore) {
    return 'penalized';
  }

  // Legend: 700+ score, 5+ migrations, 6+ months
  if (
    score >= TIER_THRESHOLDS.LEGEND.minScore &&
    migrationCount >= TIER_THRESHOLDS.LEGEND.minMigrations &&
    accountAgeMonths >= TIER_THRESHOLDS.LEGEND.minMonths
  ) {
    return 'legend';
  }

  // Elite: 600+ score, 3+ migrations
  if (
    score >= TIER_THRESHOLDS.ELITE.minScore &&
    migrationCount >= TIER_THRESHOLDS.ELITE.minMigrations
  ) {
    return 'elite';
  }

  // Rising Star: 500+ score, at least one $500K+ launch
  if (
    score >= TIER_THRESHOLDS.RISING_STAR.minScore &&
    maxAthMarketCap >= TIER_THRESHOLDS.RISING_STAR.minMcap
  ) {
    return 'rising_star';
  }

  // Proven: 450+ score, 1+ migration
  if (
    score >= TIER_THRESHOLDS.PROVEN.minScore &&
    migrationCount >= TIER_THRESHOLDS.PROVEN.minMigrations
  ) {
    return 'proven';
  }

  // Builder: 300+ score, 3+ tokens
  if (
    score >= TIER_THRESHOLDS.BUILDER.minScore &&
    tokenCount >= TIER_THRESHOLDS.BUILDER.minTokens
  ) {
    return 'builder';
  }

  // Verified: 150+ score
  if (score >= TIER_THRESHOLDS.VERIFIED.minScore) {
    return 'verified';
  }

  // Below 150 with wallets
  if (walletCount > 0) {
    return rugCount > 0 ? 'penalized' : 'verified';
  }

  return 'unverified';
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: DevTier): {
  name: string;
  color: string;
  description: string;
} {
  const tierInfo: Record<DevTier, { name: string; color: string; description: string }> = {
    legend: {
      name: 'Legend',
      color: '#FFD700',
      description: '5+ migrations, 700+ score, 6+ months',
    },
    elite: {
      name: 'Elite',
      color: '#9B59B6',
      description: '3+ migrations, 600+ score',
    },
    rising_star: {
      name: 'Rising Star',
      color: '#F59E0B',
      description: 'Exceptional launch ($500K+ ATH)',
    },
    proven: {
      name: 'Proven',
      color: '#27AE60',
      description: '1+ migration, 450+ score',
    },
    builder: {
      name: 'Builder',
      color: '#3498DB',
      description: '3+ tokens, 300+ score',
    },
    verified: {
      name: 'Verified',
      color: '#95A5A6',
      description: 'Wallet verified, 150+ score',
    },
    penalized: {
      name: 'Penalized',
      color: '#8B0000',
      description: 'Has rug history',
    },
    unverified: {
      name: 'Unverified',
      color: '#BDC3C7',
      description: 'No verified wallets',
    },
  };

  return tierInfo[tier];
}

/**
 * Get months since a date
 */
export function getMonthsOld(date: Date): number {
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 +
                 (now.getMonth() - date.getMonth());
  return Math.max(0, months);
}
