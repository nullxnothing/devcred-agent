import { batchGetHolderCountsQuick, getHolderCountForScoring } from '../helius';
import { SCORE_CONSTANTS } from './constants';
import { TokenScoreInput, TokenScoreBreakdown } from './types';

/**
 * Calculate score for a single token (0-100, or -100 if rugged)
 */
export async function calculateTokenScore(input: TokenScoreInput): Promise<{
  score: number;
  breakdown: TokenScoreBreakdown;
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
  const athMarketCap = input.marketData?.athMarketCap || input.marketData?.marketCap || 0;
  if (athMarketCap >= 10_000_000) breakdown.traction = 25;
  else if (athMarketCap >= 1_000_000) breakdown.traction = 22;
  else if (athMarketCap >= 500_000) breakdown.traction = 18;
  else if (athMarketCap >= 100_000) breakdown.traction = 14;
  else if (athMarketCap >= 50_000) breakdown.traction = 10;
  else if (athMarketCap >= 20_000) breakdown.traction = 6;
  else if (athMarketCap >= 10_000) breakdown.traction = 3;

  // ========== HOLDER RETENTION (0-20 points) ==========
  let holderCount = input.holderCount || 0;
  if (!holderCount && input.mintAddress) {
    try {
      holderCount = await getHolderCountForScoring(input.mintAddress);
    } catch {
      holderCount = 0;
    }
  }

  if (holderCount >= 5000) breakdown.holderRetention = 20;
  else if (holderCount >= 1000) breakdown.holderRetention = 15;
  else if (holderCount >= 500) breakdown.holderRetention = 10;
  else if (holderCount >= 100) breakdown.holderRetention = 5;
  else if (holderCount >= 50) breakdown.holderRetention = 2;

  // ========== DEV BEHAVIOR (0-15 points) ==========
  const devHoldingPercent = input.devHoldingPercent ?? 10;
  if (devHoldingPercent >= 50) breakdown.devBehavior = 0;
  else if (devHoldingPercent >= 20) breakdown.devBehavior = 5;
  else if (devHoldingPercent >= 5) breakdown.devBehavior = 10;
  else if (devHoldingPercent >= 1) breakdown.devBehavior = 15;
  else breakdown.devBehavior = 10;

  // ========== LONGEVITY (0-10 points) ==========
  const ageInDays = (Date.now() - input.launchDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays >= 90) breakdown.longevity = 10;
  else if (ageInDays >= 30) breakdown.longevity = 7;
  else if (ageInDays >= 7) breakdown.longevity = 4;
  else if (ageInDays >= 1) breakdown.longevity = 1;

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
