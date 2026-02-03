/**
 * Multi-Wallet Aggregation
 *
 * Aggregates token scores and stats across multiple wallets belonging
 * to the same user. Handles deduplication of tokens that might be
 * linked to multiple wallets.
 */

import { scanWallet, scanWalletQuick, WalletScanResult, TokenWithScore } from './wallet-scan';
import { calculateDevScore, getTierInfo, DevTier, TokenScoreBreakdown } from './scoring';
import {
  getCachedWalletScan,
  setCachedWalletScan,
} from './cache';

export interface AggregatedToken extends TokenWithScore {
  sourceWallet: string;
}

export interface UserProfile {
  userId: string;
  wallets: WalletScanResult[];
  aggregatedScore: number;
  aggregatedTier: DevTier;
  tierName: string;
  tierColor: string;
  totalTokensLaunched: number;
  totalMigrations: number;
  totalRugs: number;
  uniqueTokens: AggregatedToken[];
  breakdown: {
    baseScore: number;
    migrationBonus: number;
    marketCapBonus: number;
    rugPenalties: number;
    averageTokenScore: number;
  };
  scanDuration: number;
}

export interface AggregationOptions {
  useCache?: boolean;
  skipRugDetection?: boolean;
  verbose?: boolean;
}

/**
 * Aggregate user profile across multiple wallets
 *
 * @param userId - User ID for the profile
 * @param walletAddresses - Array of wallet addresses to aggregate
 * @param options - Aggregation options
 * @returns Aggregated user profile with combined scores
 */
export async function aggregateUserProfile(
  userId: string,
  walletAddresses: string[],
  options: AggregationOptions = {}
): Promise<UserProfile> {
  const startTime = Date.now();
  const log = options.verbose ? console.log : () => {};

  if (walletAddresses.length === 0) {
    const tierInfo = getTierInfo('unverified');
    return {
      userId,
      wallets: [],
      aggregatedScore: 0,
      aggregatedTier: 'unverified',
      tierName: tierInfo.name,
      tierColor: tierInfo.color,
      totalTokensLaunched: 0,
      totalMigrations: 0,
      totalRugs: 0,
      uniqueTokens: [],
      breakdown: {
        baseScore: 0,
        migrationBonus: 0,
        marketCapBonus: 0,
        rugPenalties: 0,
        averageTokenScore: 0,
      },
      scanDuration: Date.now() - startTime,
    };
  }

  log(`Aggregating ${walletAddresses.length} wallets for user ${userId}`);

  // Scan all wallets in parallel
  const walletScans: WalletScanResult[] = [];

  if (options.useCache) {
    // Try to get cached results first
    const scanPromises = walletAddresses.map(async (wallet) => {
      const cached = await getCachedWalletScan(wallet);
      if (cached) {
        log(`Using cached scan for ${wallet.slice(0, 8)}...`);
        return {
          walletAddress: wallet,
          tokensCreated: cached.tokensData as TokenWithScore[],
          totalScore: cached.totalScore,
          tier: cached.tier as DevTier,
          tierName: getTierInfo(cached.tier as DevTier).name,
          tierColor: getTierInfo(cached.tier as DevTier).color,
          breakdown: {
            tokenCount: cached.tokenCount,
            migrationCount: cached.migrationCount,
            rugCount: cached.rugCount,
            averageTokenScore: 0,
          },
          scanDuration: 0,
        } as WalletScanResult;
      }

      // No cache, do fresh scan
      log(`Fresh scan for ${wallet.slice(0, 8)}...`);
      const scan = options.skipRugDetection
        ? await scanWalletQuick(wallet)
        : await scanWallet(wallet);

      // Cache the result
      await setCachedWalletScan(wallet, {
        totalScore: scan.totalScore,
        tier: scan.tier,
        tokenCount: scan.breakdown.tokenCount,
        migrationCount: scan.breakdown.migrationCount,
        rugCount: scan.breakdown.rugCount,
        tokensData: scan.tokensCreated,
      });

      return scan;
    });

    const results = await Promise.all(scanPromises);
    walletScans.push(...results);
  } else {
    // Fresh scan all wallets in parallel
    const scanPromises = walletAddresses.map((wallet) =>
      options.skipRugDetection
        ? scanWalletQuick(wallet)
        : scanWallet(wallet)
    );

    const results = await Promise.all(scanPromises);
    walletScans.push(...results);
  }

  // Deduplicate tokens (same token might be linked to multiple wallets)
  const seenMints = new Set<string>();
  const uniqueTokens: AggregatedToken[] = [];

  for (const scan of walletScans) {
    for (const token of scan.tokensCreated) {
      if (!seenMints.has(token.mintAddress)) {
        seenMints.add(token.mintAddress);
        uniqueTokens.push({
          ...token,
          sourceWallet: scan.walletAddress,
        });
      }
    }
  }

  // Calculate aggregated stats
  const totalMigrations = uniqueTokens.filter(t => t.migrated).length;
  const totalRugs = uniqueTokens.filter(t => t.isRugged).length;

  // Calculate aggregated dev score using all unique tokens
  const devScoreResult = calculateDevScore({
    tokens: uniqueTokens.map(t => ({
      score: t.score.total,
      migrated: t.migrated,
      launchDate: new Date(t.launchedAt * 1000),
      athMarketCap: t.marketCap || undefined,
      status: t.isRugged ? 'rug' as const : 'active' as const,
    })),
    walletCount: walletAddresses.length,
    accountCreatedAt: new Date(), // Could be passed in from user data
  });

  const tierInfo = getTierInfo(devScoreResult.tier);
  const validTokens = uniqueTokens.filter(t => t.score.total >= 0);
  const averageTokenScore = validTokens.length > 0
    ? validTokens.reduce((sum, t) => sum + t.score.total, 0) / validTokens.length
    : 0;

  log(`Aggregation complete: ${uniqueTokens.length} unique tokens, score ${devScoreResult.score}`);

  return {
    userId,
    wallets: walletScans,
    aggregatedScore: devScoreResult.score,
    aggregatedTier: devScoreResult.tier,
    tierName: tierInfo.name,
    tierColor: tierInfo.color,
    totalTokensLaunched: uniqueTokens.length,
    totalMigrations,
    totalRugs,
    uniqueTokens,
    breakdown: {
      baseScore: devScoreResult.breakdown.baseScore,
      migrationBonus: devScoreResult.breakdown.migrationBonus,
      marketCapBonus: devScoreResult.breakdown.marketCapBonus,
      rugPenalties: devScoreResult.breakdown.rugPenalties,
      averageTokenScore: Math.round(averageTokenScore),
    },
    scanDuration: Date.now() - startTime,
  };
}

/**
 * Quick aggregation - uses cache and skips rug detection
 */
export async function aggregateUserProfileQuick(
  userId: string,
  walletAddresses: string[]
): Promise<UserProfile> {
  return aggregateUserProfile(userId, walletAddresses, {
    useCache: true,
    skipRugDetection: true,
  });
}

/**
 * Full aggregation - fresh scans with rug detection
 */
export async function aggregateUserProfileFull(
  userId: string,
  walletAddresses: string[]
): Promise<UserProfile> {
  return aggregateUserProfile(userId, walletAddresses, {
    useCache: false,
    skipRugDetection: false,
    verbose: true,
  });
}

/**
 * Get the primary (highest scoring) wallet from a set
 */
export function getPrimaryWallet(walletScans: WalletScanResult[]): WalletScanResult | null {
  if (walletScans.length === 0) return null;

  return walletScans.reduce((best, current) =>
    current.totalScore > best.totalScore ? current : best
  );
}

/**
 * Get tokens sorted by score (highest first)
 */
export function getTopTokens(
  tokens: AggregatedToken[],
  limit: number = 10
): AggregatedToken[] {
  return [...tokens]
    .filter(t => t.score.total >= 0)
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, limit);
}

/**
 * Get tokens sorted by market cap (highest first)
 */
export function getTopTokensByMarketCap(
  tokens: AggregatedToken[],
  limit: number = 10
): AggregatedToken[] {
  return [...tokens]
    .filter(t => t.marketCap && t.marketCap > 0)
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, limit);
}

/**
 * Get recently launched tokens
 */
export function getRecentTokens(
  tokens: AggregatedToken[],
  limit: number = 10
): AggregatedToken[] {
  return [...tokens]
    .sort((a, b) => b.launchedAt - a.launchedAt)
    .slice(0, limit);
}

/**
 * Calculate wallet contribution to overall score
 */
export function getWalletContributions(
  walletScans: WalletScanResult[]
): Array<{
  walletAddress: string;
  tokenCount: number;
  migrationCount: number;
  contributionPercent: number;
}> {
  const totalTokens = walletScans.reduce(
    (sum, w) => sum + w.breakdown.tokenCount,
    0
  );

  return walletScans.map(wallet => ({
    walletAddress: wallet.walletAddress,
    tokenCount: wallet.breakdown.tokenCount,
    migrationCount: wallet.breakdown.migrationCount,
    contributionPercent: totalTokens > 0
      ? Math.round((wallet.breakdown.tokenCount / totalTokens) * 100)
      : 0,
  }));
}
