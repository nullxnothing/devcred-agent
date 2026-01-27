/**
 * Scoring Engine for DevKarma
 * Calculates token scores (0-150) and dev scores (0-740)
 */

import { getTokenHolders, getTokenTransfersForWallet } from './helius';
import { getTokenMarketData, checkMigrationStatus, TokenMarketData, MigrationStatus } from './dexscreener';

// Scoring constants - no magic numbers
const SCORE_CONSTANTS = {
  // Token score caps
  MAX_TOKEN_SCORE: 150,

  // Migration bonus
  MIGRATION_BONUS: 50,

  // ATH Market Cap scoring
  ATH_MAX_SCORE: 30,
  ATH_DIVISOR: 25000, // $25K for each point (more generous)

  // Holder retention scoring
  HOLDER_RETENTION_MAX_SCORE: 20,

  // Dev behavior scoring
  DEV_BEHAVIOR_MAX_SCORE: 20,
  DEV_DUMP_THRESHOLD_PERCENT: 50, // >50% sold = dump
  DEV_DUMP_SEVERE_THRESHOLD: 80, // >80% sold = severe dump

  // Bundle scoring
  BUNDLE_MAX_SCORE: 15,
  BUNDLE_EXCELLENT_THRESHOLD: 5, // <5% bundled
  BUNDLE_GOOD_THRESHOLD: 10, // <10% bundled
  BUNDLE_ACCEPTABLE_THRESHOLD: 20, // <20% bundled

  // Longevity scoring
  LONGEVITY_MAX_SCORE: 10,
  LONGEVITY_DAYS_PER_POINT: 7, // 1 point per week

  // Community scoring
  COMMUNITY_MAX_SCORE: 5,

  // Rug penalty
  RUG_PENALTY: -100,

  // Dev score
  MAX_DEV_SCORE: 740,
  MIN_TOKENS_FOR_FULL_WEIGHT: 3, // Need 3+ tokens for full score weight (more lenient)
  DEV_SCORE_MULTIPLIER: 5, // Convert token average to 740 scale
} as const;

// Tier thresholds
export const TIER_THRESHOLDS = {
  LEGEND: { minScore: 720, minMigrations: 5, minMonths: 6 },
  ELITE: { minScore: 700, minMigrations: 3 },
  PROVEN: { minMigrations: 1 },
  BUILDER: { minTokens: 3 },
  VERIFIED: { minWallets: 1 },
  UNVERIFIED: {},
} as const;

export type DevTier = 'legend' | 'elite' | 'proven' | 'builder' | 'verified' | 'unverified';

export interface TokenScoreBreakdown {
  migration: number;
  athMarketCap: number;
  holderRetention: number;
  devBehavior: number;
  bundleBehavior: number;
  longevity: number;
  community: number;
  rugPenalty: number;
  total: number;
}

export interface TokenScoreInput {
  mintAddress: string;
  creatorWallet: string;
  launchDate: Date;
  isRugged?: boolean;
  communityActive?: boolean;
  bundlePercent?: number;
  // Optional pre-fetched data (to avoid redundant API calls)
  marketData?: TokenMarketData | null;
  migrationStatus?: MigrationStatus;
  holderCount?: number;
  holderCountAtAth?: number;
}

export interface DevScoreInput {
  tokens: Array<{
    score: number;
    migrated: boolean;
    launchDate: Date;
  }>;
  walletCount: number;
  accountCreatedAt: Date;
}

export interface DevScoreResult {
  score: number;
  tier: DevTier;
  breakdown: {
    tokenCount: number;
    migrationCount: number;
    averageTokenScore: number;
    weightedScore: number;
    accountAgeMonths: number;
  };
}

/**
 * Calculate score for a single token
 * Returns score (0-150) with full breakdown
 */
export async function calculateTokenScore(input: TokenScoreInput): Promise<{
  score: number;
  breakdown: TokenScoreBreakdown;
}> {
  const breakdown: TokenScoreBreakdown = {
    migration: 0,
    athMarketCap: 0,
    holderRetention: 0,
    devBehavior: 0,
    bundleBehavior: 0,
    longevity: 0,
    community: 0,
    rugPenalty: 0,
    total: 0,
  };

  // Fetch data if not provided
  const marketData = input.marketData ?? await getTokenMarketData(input.mintAddress);
  const migrationStatus = input.migrationStatus ?? await checkMigrationStatus(input.mintAddress);

  // 1. Migration bonus (+50)
  if (migrationStatus.migrated) {
    breakdown.migration = SCORE_CONSTANTS.MIGRATION_BONUS;
  }

  // 2. ATH Market Cap (+1 to +30)
  if (marketData?.marketCap) {
    // Using current market cap as proxy for ATH if ATH not available
    // In production, you'd track ATH over time
    breakdown.athMarketCap = Math.min(
      SCORE_CONSTANTS.ATH_MAX_SCORE,
      Math.floor(marketData.marketCap / SCORE_CONSTANTS.ATH_DIVISOR)
    );
  }

  // 3. Holder Retention (+1 to +20)
  if (input.holderCount && input.holderCountAtAth && input.holderCountAtAth > 0) {
    const retentionRate = input.holderCount / input.holderCountAtAth;
    breakdown.holderRetention = Math.min(
      SCORE_CONSTANTS.HOLDER_RETENTION_MAX_SCORE,
      Math.floor(retentionRate * SCORE_CONSTANTS.HOLDER_RETENTION_MAX_SCORE)
    );
  } else {
    // Fetch current holder count if not provided
    try {
      const holdersData = await getTokenHolders(input.mintAddress);
      // Without ATH data, give partial credit based on current holder count
      // 1 point per 100 holders, max 20
      breakdown.holderRetention = Math.min(
        SCORE_CONSTANTS.HOLDER_RETENTION_MAX_SCORE,
        Math.floor(holdersData.totalHolders / 100)
      );
    } catch {
      // API error - no points
      breakdown.holderRetention = 0;
    }
  }

  // 4. Dev Didn't Dump (+1 to +20)
  try {
    const dumpSeverity = await analyzeDevSellPattern(input.creatorWallet, input.mintAddress);
    breakdown.devBehavior = Math.max(
      0,
      SCORE_CONSTANTS.DEV_BEHAVIOR_MAX_SCORE - dumpSeverity
    );
  } catch {
    // Give benefit of the doubt if we can't analyze
    breakdown.devBehavior = Math.floor(SCORE_CONSTANTS.DEV_BEHAVIOR_MAX_SCORE / 2);
  }

  // 5. Bundle % Low (+1 to +15)
  if (input.bundlePercent !== undefined) {
    breakdown.bundleBehavior = calculateBundleScore(input.bundlePercent);
  } else {
    // Default to mid-range if unknown
    breakdown.bundleBehavior = Math.floor(SCORE_CONSTANTS.BUNDLE_MAX_SCORE / 2);
  }

  // 6. Longevity (+1 to +10)
  const daysActive = Math.floor(
    (Date.now() - input.launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  breakdown.longevity = Math.min(
    SCORE_CONSTANTS.LONGEVITY_MAX_SCORE,
    Math.floor(daysActive / SCORE_CONSTANTS.LONGEVITY_DAYS_PER_POINT)
  );

  // 7. Community exists (+1 to +5)
  if (input.communityActive) {
    breakdown.community = SCORE_CONSTANTS.COMMUNITY_MAX_SCORE;
  }

  // 8. Rug penalty (-100)
  if (input.isRugged) {
    breakdown.rugPenalty = SCORE_CONSTANTS.RUG_PENALTY;
  }

  // Calculate total
  breakdown.total = Math.max(
    0,
    Math.min(
      SCORE_CONSTANTS.MAX_TOKEN_SCORE,
      breakdown.migration +
      breakdown.athMarketCap +
      breakdown.holderRetention +
      breakdown.devBehavior +
      breakdown.bundleBehavior +
      breakdown.longevity +
      breakdown.community +
      breakdown.rugPenalty
    )
  );

  return { score: breakdown.total, breakdown };
}

/**
 * Analyze dev wallet sell pattern to detect dumps
 * Returns severity score 0-20 (0 = no dump, 20 = severe dump)
 */
async function analyzeDevSellPattern(
  devWallet: string,
  mintAddress: string
): Promise<number> {
  const transfers = await getTokenTransfersForWallet(devWallet, mintAddress, { limit: 100 });

  if (transfers.length === 0) {
    return 0; // No transfers = no dump
  }

  let totalReceived = 0;
  let totalSent = 0;

  for (const tx of transfers) {
    for (const transfer of tx.tokenTransfers) {
      if (transfer.mint !== mintAddress) continue;

      if (transfer.to === devWallet) {
        totalReceived += transfer.amount;
      } else if (transfer.from === devWallet) {
        totalSent += transfer.amount;
      }
    }
  }

  if (totalReceived === 0) {
    return 0;
  }

  const sellPercent = (totalSent / totalReceived) * 100;

  if (sellPercent >= SCORE_CONSTANTS.DEV_DUMP_SEVERE_THRESHOLD) {
    return 20; // Severe dump
  } else if (sellPercent >= SCORE_CONSTANTS.DEV_DUMP_THRESHOLD_PERCENT) {
    return 15; // Significant dump
  } else if (sellPercent >= 30) {
    return 10; // Moderate selling
  } else if (sellPercent >= 10) {
    return 5; // Light selling (acceptable)
  }

  return 0; // Minimal selling
}

/**
 * Calculate bundle score based on bundle percentage
 */
function calculateBundleScore(bundlePercent: number): number {
  if (bundlePercent < SCORE_CONSTANTS.BUNDLE_EXCELLENT_THRESHOLD) {
    return SCORE_CONSTANTS.BUNDLE_MAX_SCORE; // <5% = full points
  } else if (bundlePercent < SCORE_CONSTANTS.BUNDLE_GOOD_THRESHOLD) {
    return 10; // 5-10% = 10 points
  } else if (bundlePercent < SCORE_CONSTANTS.BUNDLE_ACCEPTABLE_THRESHOLD) {
    return 5; // 10-20% = 5 points
  }
  return 0; // >20% = no points
}

/**
 * Calculate overall dev score from all their tokens
 * Returns score (0-740) with tier and breakdown
 */
export function calculateDevScore(input: DevScoreInput): DevScoreResult {
  const { tokens, walletCount, accountCreatedAt } = input;

  if (tokens.length === 0) {
    return {
      score: 0,
      tier: walletCount > 0 ? 'verified' : 'unverified',
      breakdown: {
        tokenCount: 0,
        migrationCount: 0,
        averageTokenScore: 0,
        weightedScore: 0,
        accountAgeMonths: getMonthsOld(accountCreatedAt),
      },
    };
  }

  const totalScore = tokens.reduce((sum, t) => sum + t.score, 0);
  const averageScore = totalScore / tokens.length;
  const migrationCount = tokens.filter(t => t.migrated).length;

  // Weight by number of tokens (more launches = more reliable data)
  const tokenWeight = Math.min(1, tokens.length / SCORE_CONSTANTS.MIN_TOKENS_FOR_FULL_WEIGHT);
  const weightedScore = averageScore * tokenWeight;

  // Convert to 740 scale
  const finalScore = Math.min(
    SCORE_CONSTANTS.MAX_DEV_SCORE,
    Math.round(weightedScore * SCORE_CONSTANTS.DEV_SCORE_MULTIPLIER)
  );

  const accountAgeMonths = getMonthsOld(accountCreatedAt);

  // Determine tier
  const tier = determineTier({
    score: finalScore,
    migrationCount,
    tokenCount: tokens.length,
    walletCount,
    accountAgeMonths,
  });

  return {
    score: finalScore,
    tier,
    breakdown: {
      tokenCount: tokens.length,
      migrationCount,
      averageTokenScore: Math.round(averageScore),
      weightedScore: Math.round(weightedScore),
      accountAgeMonths,
    },
  };
}

/**
 * Determine dev tier based on score and metrics
 */
function determineTier(metrics: {
  score: number;
  migrationCount: number;
  tokenCount: number;
  walletCount: number;
  accountAgeMonths: number;
}): DevTier {
  const { score, migrationCount, tokenCount, walletCount, accountAgeMonths } = metrics;

  // Legend: 720+ score, 5+ migrations, 6+ months
  if (
    score >= TIER_THRESHOLDS.LEGEND.minScore &&
    migrationCount >= TIER_THRESHOLDS.LEGEND.minMigrations &&
    accountAgeMonths >= TIER_THRESHOLDS.LEGEND.minMonths
  ) {
    return 'legend';
  }

  // Elite: 700+ score, 3+ migrations
  if (
    score >= TIER_THRESHOLDS.ELITE.minScore &&
    migrationCount >= TIER_THRESHOLDS.ELITE.minMigrations
  ) {
    return 'elite';
  }

  // Proven: 1+ migration
  if (migrationCount >= TIER_THRESHOLDS.PROVEN.minMigrations) {
    return 'proven';
  }

  // Builder: 3+ tokens
  if (tokenCount >= TIER_THRESHOLDS.BUILDER.minTokens) {
    return 'builder';
  }

  // Verified: 1+ wallet
  if (walletCount >= TIER_THRESHOLDS.VERIFIED.minWallets) {
    return 'verified';
  }

  return 'unverified';
}

/**
 * Get months since a date
 */
function getMonthsOld(date: Date): number {
  const now = new Date();
  const months = (now.getFullYear() - date.getFullYear()) * 12 +
                 (now.getMonth() - date.getMonth());
  return Math.max(0, months);
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
      color: '#FFD700', // Gold
      description: '5+ migrations, 720+ score, 6+ months',
    },
    elite: {
      name: 'Elite',
      color: '#9B59B6', // Purple
      description: '3+ migrations, 700+ score',
    },
    proven: {
      name: 'Proven',
      color: '#27AE60', // Green
      description: '1+ successful migration',
    },
    builder: {
      name: 'Builder',
      color: '#3498DB', // Blue
      description: '3+ tokens launched',
    },
    verified: {
      name: 'Verified',
      color: '#95A5A6', // Gray
      description: 'Wallet verified',
    },
    unverified: {
      name: 'Unverified',
      color: '#BDC3C7', // Light gray
      description: 'No verified wallets',
    },
  };

  return tierInfo[tier];
}

/**
 * Quick score estimation without full API calls
 * Useful for batch processing or previews
 */
export function estimateTokenScore(params: {
  migrated: boolean;
  marketCap: number;
  holderCount: number;
  daysOld: number;
  isRugged: boolean;
}): number {
  let score = 0;

  if (params.migrated) {
    score += SCORE_CONSTANTS.MIGRATION_BONUS;
  }

  score += Math.min(
    SCORE_CONSTANTS.ATH_MAX_SCORE,
    Math.floor(params.marketCap / SCORE_CONSTANTS.ATH_DIVISOR)
  );

  score += Math.min(
    SCORE_CONSTANTS.HOLDER_RETENTION_MAX_SCORE,
    Math.floor(params.holderCount / 100)
  );

  score += Math.min(
    SCORE_CONSTANTS.LONGEVITY_MAX_SCORE,
    Math.floor(params.daysOld / SCORE_CONSTANTS.LONGEVITY_DAYS_PER_POINT)
  );

  // Assume average for unknown factors
  score += Math.floor(SCORE_CONSTANTS.DEV_BEHAVIOR_MAX_SCORE / 2);
  score += Math.floor(SCORE_CONSTANTS.BUNDLE_MAX_SCORE / 2);

  if (params.isRugged) {
    score += SCORE_CONSTANTS.RUG_PENALTY;
  }

  return Math.max(0, Math.min(SCORE_CONSTANTS.MAX_TOKEN_SCORE, score));
}
