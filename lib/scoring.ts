/**
 * Scoring Engine — Blacklist Threat Assessment
 *
 * SCORING SYSTEM:
 * - Token scores: 0-100 per token
 *   - Migration: 0-30 (did it successfully migrate to DEX?)
 *   - Traction: 0-25 (ATH market cap achieved)
 *   - Holder Retention: 0-20 (how many holders stuck around?)
 *   - Dev Behavior: 0-15 (did dev dump or hold reasonably?)
 *   - Longevity: 0-10 (how long has token been alive?)
 *   - Rug Penalty: -100 (detected rug = total score is -100)
 *
 * - Dev scores: 0-740 (weighted average + bonuses)
 *   - Base calculation from token scores
 *   - Bonuses for migrations and market cap milestones
 *   - Heavy penalties for rugs
 */

import { batchGetHolderCountsQuick, getHolderCountForScoring } from './helius';
import { TokenMarketData, MigrationStatus } from './dexscreener';

// Scoring constants
const SCORE_CONSTANTS = {
  // Token score components (total max: 100)
  MAX_TOKEN_SCORE: 100,
  MIGRATION_MAX: 30,
  TRACTION_MAX: 25,
  HOLDER_RETENTION_MAX: 20,
  DEV_BEHAVIOR_MAX: 15,
  LONGEVITY_MAX: 10,

  // Rug penalty
  RUG_PENALTY: -100,

  // Dev score bounds
  BASE_DEV_SCORE: 500,
  FLOOR_DEV_SCORE: 0,
  MAX_DEV_SCORE: 740,

  // Dev score calculation
  BASE_MULTIPLIER: 5.5, // Scales token avg to 0-550 range
  FIRST_MIGRATION_BONUS: 150, // Big bonus for first successful migration (was 75)

  // Dev score bonuses per additional migration
  MIGRATION_BONUS: 75, // For 2nd, 3rd, etc. (was 25)

  // Market cap milestone bonuses
  MCAP_100K_BONUS: 50,   // was 25
  MCAP_500K_BONUS: 75,   // was 50
  MCAP_1M_BONUS: 100,    // was 75
  MCAP_10M_BONUS: 125,   // was 100

  // Rug penalty for dev score (per rug)
  DEV_RUG_PENALTY: 150,          // Legacy flat penalty
  DEV_HARD_RUG_PENALTY: 200,     // Hard rug: dumped 90%+ within 24h
  DEV_SOFT_RUG_PENALTY: 100,     // Soft rug: gradual exit over time
} as const;

// Tier thresholds
export const TIER_THRESHOLDS = {
  SOVEREIGN: { minScore: 700, minMigrations: 5, minMonths: 6 },
  CLEARED: { minScore: 600, minMigrations: 3 },
  OPERATIVE: { minScore: 500, minMcap: 500_000 },
  VETTED: { minScore: 450, minMigrations: 1 },
  TRACKED: { minScore: 300, minTokens: 3 },
  FILED: { minScore: 150 },
  FLAGGED: { maxScore: 150 },
  GHOST: {},
} as const;

export type DevTier = 'sovereign' | 'cleared' | 'operative' | 'vetted' | 'tracked' | 'filed' | 'flagged' | 'ghost';

export interface TokenScoreBreakdown {
  migration: number;      // 0-30
  traction: number;       // 0-25 (was athMarketCap)
  holderRetention: number; // 0-20
  devBehavior: number;    // 0-15 (or -100 for rug)
  longevity: number;      // 0-10
  total: number;          // 0-100 (or -100 for rug)
}

// Keep old interface for backward compatibility
export interface TokenScoreInput {
  mintAddress: string;
  creatorWallet: string;
  launchDate: Date;
  isRugged?: boolean;
  rugSeverity?: 'soft' | 'hard' | null;
  communityActive?: boolean;
  bundlePercent?: number;
  // Optional pre-fetched data
  marketData?: TokenMarketData | null;
  migrationStatus?: MigrationStatus;
  holderCount?: number;
  holderCountAtAth?: number;
  devHoldingPercent?: number;
}

export interface DevScoreInput {
  tokens: Array<{
    score: number;
    migrated: boolean;
    launchDate: Date;
    athMarketCap?: number;
    status?: 'active' | 'inactive' | 'rug';
    rugSeverity?: 'soft' | 'hard' | null;
  }>;
  walletCount: number;
  accountCreatedAt: Date;
}

export interface DevScoreResult {
  score: number;
  tier: DevTier;
  breakdown: {
    baseScore: number;
    tokenCount: number;
    migrationCount: number;
    migrationBonus: number;
    marketCapBonus: number;
    tokenScoreBonus: number;
    rugPenalties: number;
    rugCount: number;
    hardRugCount: number;
    accountAgeMonths: number;
    averageTokenScore: number;
  };
}

export interface RugDetectionResult {
  isRug: boolean;
  severity: 'soft' | 'hard' | null;
  sellPercent: number;
  sellTimestampFirst?: number;
  sellTimestampLast?: number;
  totalReceived: number;
  totalSold: number;
}

/**
 * Calculate score for a single token (0-100, or -100 if rugged)
 */
export async function calculateTokenScore(input: TokenScoreInput): Promise<{
  score: number;
  breakdown: TokenScoreBreakdown;
  rugDetection?: RugDetectionResult;
}> {
  // If rugged, return -100 immediately
  if (input.isRugged) {
    return {
      score: -100,
      breakdown: {
        migration: 0,
        traction: 0,
        holderRetention: 0,
        devBehavior: -100,
        longevity: 0,
        total: -100,
      },
    };
  }

  const breakdown: TokenScoreBreakdown = {
    migration: 0,
    traction: 0,
    holderRetention: 0,
    devBehavior: 0,
    longevity: 0,
    total: 0,
  };

  // ========== MIGRATION (0-30 points) ==========
  const migrated = input.migrationStatus?.migrated ?? false;
  if (migrated) {
    breakdown.migration = SCORE_CONSTANTS.MIGRATION_MAX;
  }

  // ========== TRACTION (0-25 points) ==========
  // Based on ATH market cap achieved (rewards past success even if token fizzled)
  // More generous thresholds - most tokens never hit $100K
  const athMarketCap = input.marketData?.athMarketCap || input.marketData?.marketCap || 0;
  if (athMarketCap >= 10_000_000) breakdown.traction = 25;       // $10M+
  else if (athMarketCap >= 1_000_000) breakdown.traction = 22;   // $1M+
  else if (athMarketCap >= 500_000) breakdown.traction = 18;     // $500K+
  else if (athMarketCap >= 100_000) breakdown.traction = 14;     // $100K+
  else if (athMarketCap >= 50_000) breakdown.traction = 10;      // $50K+
  else if (athMarketCap >= 20_000) breakdown.traction = 6;       // $20K+
  else if (athMarketCap >= 10_000) breakdown.traction = 3;       // $10K+ (just migrated)

  // ========== HOLDER RETENTION (0-20 points) ==========
  let holderCount: number | null = input.holderCount ?? null;
  let holderFetchFailed = false;

  if (holderCount === null && input.mintAddress) {
    try {
      // Use smart function that paginates until 5000+ confirmed (max tier)
      holderCount = await getHolderCountForScoring(input.mintAddress);
    } catch {
      // Mark as failed - don't penalize for API errors
      holderFetchFailed = true;
      holderCount = null;
    }
  }

  // Only apply holder score if we have valid data
  // Skip scoring entirely on API errors (don't penalize with 0)
  if (holderCount !== null && !holderFetchFailed) {
    if (holderCount >= 5000) breakdown.holderRetention = 20;
    else if (holderCount >= 1000) breakdown.holderRetention = 15;
    else if (holderCount >= 500) breakdown.holderRetention = 10;
    else if (holderCount >= 100) breakdown.holderRetention = 5;
    else if (holderCount >= 50) breakdown.holderRetention = 2;
  } else if (holderFetchFailed) {
    // On API error, give neutral score (half of max) rather than 0
    breakdown.holderRetention = 10;
  }

  // ========== DEV BEHAVIOR (0-15 points) ==========
  // Based on how much dev still holds (less is better, but 0 is neutral)
  const devHoldingPercent = input.devHoldingPercent ?? 10; // Assume 10% if unknown
  if (devHoldingPercent >= 50) breakdown.devBehavior = 0;       // Holding too much = suspicious
  else if (devHoldingPercent >= 20) breakdown.devBehavior = 5;  // Still holding significant
  else if (devHoldingPercent >= 5) breakdown.devBehavior = 10;  // Reasonable hold
  else if (devHoldingPercent >= 1) breakdown.devBehavior = 15;  // Distributed well
  else breakdown.devBehavior = 10; // Fully sold (neutral - could be good or bad)

  // ========== LONGEVITY (0-10 points) ==========
  const ageInDays = (Date.now() - input.launchDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays >= 90) breakdown.longevity = 10;      // 3+ months
  else if (ageInDays >= 30) breakdown.longevity = 7;  // 1+ month
  else if (ageInDays >= 7) breakdown.longevity = 4;   // 1+ week
  else if (ageInDays >= 1) breakdown.longevity = 1;   // 1+ day

  // Calculate total
  breakdown.total = Math.min(
    SCORE_CONSTANTS.MAX_TOKEN_SCORE,
    breakdown.migration +
    breakdown.traction +
    breakdown.holderRetention +
    breakdown.devBehavior +
    breakdown.longevity
  );

  return { score: breakdown.total, breakdown };
}

/**
 * Calculate scores for multiple tokens with batched API calls
 */
export async function calculateTokenScoresBatch(
  inputs: TokenScoreInput[]
): Promise<Array<{
  mintAddress: string;
  score: number;
  breakdown: TokenScoreBreakdown;
}>> {
  if (inputs.length === 0) {
    return [];
  }

  // Pre-fetch holder counts for all tokens that don't have them
  const mintsNeedingHolders = inputs
    .filter(i => !i.holderCount)
    .map(i => i.mintAddress);

  const holderCounts = mintsNeedingHolders.length > 0
    ? await batchGetHolderCountsQuick(mintsNeedingHolders)
    : new Map<string, number>();

  // Calculate scores with pre-fetched holder data
  const results = await Promise.all(
    inputs.map(async (input) => {
      const holderCount = input.holderCount || holderCounts.get(input.mintAddress) || 0;
      const result = await calculateTokenScore({
        ...input,
        holderCount,
      });
      return {
        mintAddress: input.mintAddress,
        ...result,
      };
    })
  );

  return results;
}

/**
 * Calculate overall dev score from all their tokens
 * Uses weighted average where better tokens count more
 */
export function calculateDevScore(input: DevScoreInput): DevScoreResult {
  const { tokens, walletCount, accountCreatedAt } = input;
  const accountAgeMonths = getMonthsOld(accountCreatedAt);

  // No tokens = unverified with 0 score
  if (tokens.length === 0) {
    return {
      score: 0,
      tier: walletCount > 0 ? 'filed' : 'ghost',
      breakdown: {
        baseScore: 0,
        tokenCount: 0,
        migrationCount: 0,
        migrationBonus: 0,
        marketCapBonus: 0,
        tokenScoreBonus: 0,
        rugPenalties: 0,
        rugCount: 0,
        hardRugCount: 0,
        accountAgeMonths,
        averageTokenScore: 0,
      },
    };
  }

  // Separate valid tokens from rugged ones
  const validTokens = tokens.filter(t => t.status !== 'rug' && t.score >= 0);
  const ruggedTokens = tokens.filter(t => t.status === 'rug' || t.score < 0);
  const hardRugCount = ruggedTokens.filter(t => t.rugSeverity === 'hard').length;

  const migrationCount = validTokens.filter(t => t.migrated).length;
  const totalTokenScore = validTokens.reduce((sum, t) => sum + Math.max(0, t.score), 0);
  const averageTokenScore = validTokens.length > 0 ? totalTokenScore / validTokens.length : 0;

  // Calculate weighted token score contribution
  // Better tokens get more weight
  let weightedSum = 0;
  let totalWeight = 0;
  for (const token of validTokens) {
    const weight = Math.max(1, token.score / 10); // Min weight of 1
    weightedSum += token.score * weight;
    totalWeight += weight;
  }
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Base score from weighted average (scale to 0-550 range)
  const baseScore = Math.round(weightedAverage * SCORE_CONSTANTS.BASE_MULTIPLIER);

  // Migration bonuses: big bonus for first, smaller for subsequent
  let migrationBonus = 0;
  if (migrationCount >= 1) {
    migrationBonus = SCORE_CONSTANTS.FIRST_MIGRATION_BONUS; // First migration: +75
    if (migrationCount > 1) {
      migrationBonus += (migrationCount - 1) * SCORE_CONSTANTS.MIGRATION_BONUS; // Additional: +25 each
    }
  }

  // Market cap bonuses
  let marketCapBonus = 0;
  for (const token of validTokens) {
    if (token.athMarketCap) {
      if (token.athMarketCap >= 10_000_000) marketCapBonus += SCORE_CONSTANTS.MCAP_10M_BONUS;
      else if (token.athMarketCap >= 1_000_000) marketCapBonus += SCORE_CONSTANTS.MCAP_1M_BONUS;
      else if (token.athMarketCap >= 500_000) marketCapBonus += SCORE_CONSTANTS.MCAP_500K_BONUS;
      else if (token.athMarketCap >= 100_000) marketCapBonus += SCORE_CONSTANTS.MCAP_100K_BONUS;
    }
  }

  // Rug penalties - differentiated by severity
  // Hard rugs (dumped 90%+ within 24h) get heavier penalty than soft rugs (gradual exit)
  const hardRugPenalties = ruggedTokens.filter(t => t.rugSeverity === 'hard').length * SCORE_CONSTANTS.DEV_HARD_RUG_PENALTY;
  const softRugPenalties = ruggedTokens.filter(t => t.rugSeverity === 'soft' || !t.rugSeverity).length * SCORE_CONSTANTS.DEV_SOFT_RUG_PENALTY;
  const rugPenalties = hardRugPenalties + softRugPenalties;

  // Calculate final score
  let score = baseScore + migrationBonus + marketCapBonus - rugPenalties;

  // Clamp to bounds
  score = Math.max(
    SCORE_CONSTANTS.FLOOR_DEV_SCORE,
    Math.min(SCORE_CONSTANTS.MAX_DEV_SCORE, score)
  );

  // Find max ATH market cap across all tokens
  const maxAthMarketCap = Math.max(0, ...validTokens.map(t => t.athMarketCap || 0));

  // Determine tier
  const tier = determineTier({
    score,
    migrationCount,
    tokenCount: tokens.length,
    walletCount,
    accountAgeMonths,
    rugCount: ruggedTokens.length,
    maxAthMarketCap,
  });

  return {
    score: Math.round(score),
    tier,
    breakdown: {
      baseScore,
      tokenCount: tokens.length,
      migrationCount,
      migrationBonus,
      marketCapBonus,
      tokenScoreBonus: Math.round(weightedAverage),
      rugPenalties,
      rugCount: ruggedTokens.length,
      hardRugCount,
      accountAgeMonths,
      averageTokenScore: Math.round(averageTokenScore),
    },
  };
}

/**
 * Determine dev tier based on score and metrics
 */
export function determineTier(metrics: {
  score: number;
  migrationCount: number;
  tokenCount: number;
  walletCount: number;
  accountAgeMonths: number;
  rugCount: number;
  maxAthMarketCap: number;
}): DevTier {
  const { score, migrationCount, tokenCount, walletCount, accountAgeMonths, rugCount, maxAthMarketCap } = metrics;

  // FLAGGED: Has rugs and score below threshold
  if (rugCount > 0 && score < TIER_THRESHOLDS.FILED.minScore) {
    return 'flagged';
  }

  // SOVEREIGN: 700+ score, 5+ migrations, 6+ months
  if (
    score >= TIER_THRESHOLDS.SOVEREIGN.minScore &&
    migrationCount >= TIER_THRESHOLDS.SOVEREIGN.minMigrations &&
    accountAgeMonths >= TIER_THRESHOLDS.SOVEREIGN.minMonths
  ) {
    return 'sovereign';
  }

  // CLEARED: 600+ score, 3+ migrations
  if (
    score >= TIER_THRESHOLDS.CLEARED.minScore &&
    migrationCount >= TIER_THRESHOLDS.CLEARED.minMigrations
  ) {
    return 'cleared';
  }

  // OPERATIVE: 500+ score, at least one $500K+ launch
  if (
    score >= TIER_THRESHOLDS.OPERATIVE.minScore &&
    maxAthMarketCap >= TIER_THRESHOLDS.OPERATIVE.minMcap
  ) {
    return 'operative';
  }

  // VETTED: 450+ score, 1+ migration
  if (
    score >= TIER_THRESHOLDS.VETTED.minScore &&
    migrationCount >= TIER_THRESHOLDS.VETTED.minMigrations
  ) {
    return 'vetted';
  }

  // TRACKED: 300+ score, 3+ tokens
  if (
    score >= TIER_THRESHOLDS.TRACKED.minScore &&
    tokenCount >= TIER_THRESHOLDS.TRACKED.minTokens
  ) {
    return 'tracked';
  }

  // FILED: 150+ score
  if (score >= TIER_THRESHOLDS.FILED.minScore) {
    return 'filed';
  }

  // Below 150 with wallets
  if (walletCount > 0) {
    return rugCount > 0 ? 'flagged' : 'filed';
  }

  return 'ghost';
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
    sovereign: {
      name: 'SOVEREIGN',
      color: 'var(--color-tier-sovereign)',
      description: '5+ migrations, 700+ score, 6+ months',
    },
    cleared: {
      name: 'CLEARED',
      color: 'var(--color-tier-cleared)',
      description: '3+ migrations, 600+ score',
    },
    operative: {
      name: 'OPERATIVE',
      color: 'var(--color-tier-operative)',
      description: 'Exceptional launch ($500K+ ATH)',
    },
    vetted: {
      name: 'VETTED',
      color: 'var(--color-tier-vetted)',
      description: '1+ migration, 450+ score',
    },
    tracked: {
      name: 'TRACKED',
      color: 'var(--color-tier-tracked)',
      description: '3+ tokens, 300+ score',
    },
    filed: {
      name: 'FILED',
      color: 'var(--color-tier-filed)',
      description: 'Wallet verified, 150+ score',
    },
    flagged: {
      name: 'FLAGGED',
      color: 'var(--color-tier-flagged)',
      description: 'Has rug history',
    },
    ghost: {
      name: 'GHOST',
      color: 'var(--color-tier-ghost)',
      description: 'No verified wallets',
    },
  };

  return tierInfo[tier];
}

/**
 * Quick score estimation without full API calls
 */
export function estimateTokenScore(params: {
  migrated: boolean;
  marketCap: number;
  holderCount: number;
  daysOld: number;
  isRugged: boolean;
}): number {
  if (params.isRugged) {
    return -100;
  }

  let score = 0;

  // Migration (0-30)
  if (params.migrated) {
    score += 30;
  }

  // Traction (0-25)
  if (params.marketCap >= 10_000_000) score += 25;
  else if (params.marketCap >= 1_000_000) score += 22;
  else if (params.marketCap >= 500_000) score += 18;
  else if (params.marketCap >= 100_000) score += 14;
  else if (params.marketCap >= 50_000) score += 10;
  else if (params.marketCap >= 20_000) score += 6;
  else if (params.marketCap >= 10_000) score += 3;

  // Holder retention (0-20)
  if (params.holderCount >= 5000) score += 20;
  else if (params.holderCount >= 1000) score += 15;
  else if (params.holderCount >= 500) score += 10;
  else if (params.holderCount >= 100) score += 5;
  else if (params.holderCount >= 50) score += 2;

  // Dev behavior - assume neutral (10)
  score += 10;

  // Longevity (0-10)
  if (params.daysOld >= 90) score += 10;
  else if (params.daysOld >= 30) score += 7;
  else if (params.daysOld >= 7) score += 4;
  else if (params.daysOld >= 1) score += 1;

  return Math.min(SCORE_CONSTANTS.MAX_TOKEN_SCORE, score);
}

/**
 * Quick dev score estimation
 */
export function estimateDevScore(params: {
  tokenCount: number;
  migrationCount: number;
  avgTokenScore: number;
  rugCount?: number;
  hardRugCount?: number;
}): number {
  // Base from average token score (scaled to 0-550)
  let score = params.avgTokenScore * SCORE_CONSTANTS.BASE_MULTIPLIER;

  // Migration bonus: first migration worth more
  if (params.migrationCount >= 1) {
    score += SCORE_CONSTANTS.FIRST_MIGRATION_BONUS;
    if (params.migrationCount > 1) {
      score += (params.migrationCount - 1) * SCORE_CONSTANTS.MIGRATION_BONUS;
    }
  }

  // Rug penalties — differentiated like calculateDevScore
  const hardRugs = params.hardRugCount || 0;
  const softRugs = (params.rugCount || 0) - hardRugs;
  score -= hardRugs * SCORE_CONSTANTS.DEV_HARD_RUG_PENALTY;
  score -= Math.max(0, softRugs) * SCORE_CONSTANTS.DEV_SOFT_RUG_PENALTY;

  return Math.max(
    SCORE_CONSTANTS.FLOOR_DEV_SCORE,
    Math.min(SCORE_CONSTANTS.MAX_DEV_SCORE, Math.round(score))
  );
}

/**
 * Calculate dev score from aggregate Axiom data (no API calls needed)
 * Used by extension when we have scraped data but no full wallet scan
 */
export function calculateDevScoreFromAggregate(params: {
  tokenCount: number;
  migrationCount: number;
  topMcap: number;
  rugCount?: number;
}): DevScoreResult {
  const { tokenCount, migrationCount, topMcap, rugCount = 0 } = params;

  // No tokens = unverified
  if (tokenCount === 0) {
    return {
      score: 0,
      tier: 'ghost',
      breakdown: {
        baseScore: 0,
        tokenCount: 0,
        migrationCount: 0,
        migrationBonus: 0,
        marketCapBonus: 0,
        tokenScoreBonus: 0,
        rugPenalties: 0,
        rugCount: 0,
        hardRugCount: 0,
        accountAgeMonths: 0,
        averageTokenScore: 0,
      },
    };
  }

  // Estimate the "best" token score using topMcap
  // Assume: migrated if migrationCount > 0, ~100 holders, 30+ days old
  const bestTokenScore = estimateTokenScore({
    migrated: migrationCount > 0,
    marketCap: topMcap,
    holderCount: 100,
    daysOld: 30,
    isRugged: false,
  });

  // For non-migrated tokens, estimate lower scores
  const nonMigratedScore = estimateTokenScore({
    migrated: false,
    marketCap: 0,
    holderCount: 20,
    daysOld: 7,
    isRugged: false,
  });

  // Build synthetic token array
  const tokens: DevScoreInput['tokens'] = [];

  // Add migrated tokens (use best score for first, slightly lower for others)
  for (let i = 0; i < migrationCount; i++) {
    const score = i === 0 ? bestTokenScore : Math.max(30, bestTokenScore - (i * 5));
    tokens.push({
      score,
      migrated: true,
      launchDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      athMarketCap: i === 0 ? topMcap : Math.min(topMcap * 0.5, 50000),
      status: 'active',
    });
  }

  // Add non-migrated tokens (fizzled launches)
  const nonMigratedCount = Math.max(0, tokenCount - migrationCount - rugCount);
  for (let i = 0; i < nonMigratedCount; i++) {
    tokens.push({
      score: nonMigratedScore,
      migrated: false,
      launchDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      athMarketCap: 0,
      status: 'inactive',
    });
  }

  // Add rugged tokens
  for (let i = 0; i < rugCount; i++) {
    tokens.push({
      score: -100,
      migrated: false,
      launchDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      athMarketCap: 0,
      status: 'rug',
      rugSeverity: 'soft',
    });
  }

  // Use the real calculateDevScore with synthetic data
  return calculateDevScore({
    tokens,
    walletCount: 1,
    accountCreatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
  });
}

// Export constants for use in other modules
export { SCORE_CONSTANTS };
