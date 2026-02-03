import { SCORE_CONSTANTS } from './constants';
import { DevScoreInput, DevScoreResult } from './types';
import { determineTier, getMonthsOld } from './tier-calculator';

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
      tier: walletCount > 0 ? 'verified' : 'unverified',
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
  let weightedSum = 0;
  let totalWeight = 0;
  for (const token of validTokens) {
    const weight = Math.max(1, token.score / 10);
    weightedSum += token.score * weight;
    totalWeight += weight;
  }
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Base score from weighted average (scale to 0-550 range)
  const baseScore = Math.round(weightedAverage * SCORE_CONSTANTS.BASE_MULTIPLIER);

  // Migration bonuses: big bonus for first, smaller for subsequent
  let migrationBonus = 0;
  if (migrationCount >= 1) {
    migrationBonus = SCORE_CONSTANTS.FIRST_MIGRATION_BONUS;
    if (migrationCount > 1) {
      migrationBonus += (migrationCount - 1) * SCORE_CONSTANTS.MIGRATION_BONUS;
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

  // Rug penalties (severe)
  const rugPenalties = ruggedTokens.length * SCORE_CONSTANTS.DEV_RUG_PENALTY;

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

  // Rug penalties
  if (params.rugCount) {
    score -= params.rugCount * SCORE_CONSTANTS.DEV_RUG_PENALTY;
  }

  return Math.max(
    SCORE_CONSTANTS.FLOOR_DEV_SCORE,
    Math.min(SCORE_CONSTANTS.MAX_DEV_SCORE, Math.round(score))
  );
}
