/**
 * Complete Wallet Scan Flow
 *
 * Orchestrates the entire process of scanning a wallet for created tokens,
 * fetching market data, holder counts, and calculating scores.
 *
 * Uses batched API calls throughout for maximum performance.
 */

import {
  getTokensCreatedByWalletViaFeePayer,
  batchGetHolderCountsQuick,
  batchGetDevHoldings,
  detectRugPattern,
} from './helius';
import {
  batchGetTokenMarketData,
} from './dexscreener';
import {
  calculateTokenScore,
  calculateDevScore,
  getTierInfo,
  TokenScoreBreakdown,
  DevTier,
} from './scoring';
import {
  getCachedWalletScan,
  setCachedWalletScan,
} from './cache';
import {
  batchDetectMigrations,
} from './migration-detection';
import { DEX_CONFIG, MigrationDexType } from './constants';

export interface TokenWithScore {
  mintAddress: string;
  name: string;
  symbol: string;
  launchedAt: number;
  migrated: boolean;
  marketCap: number | null;
  currentHolders: number;
  devHoldingPercent: number;
  isRugged: boolean;
  score: TokenScoreBreakdown;
}

export interface WalletScanResult {
  walletAddress: string;
  tokensCreated: TokenWithScore[];
  totalScore: number;
  tier: DevTier;
  tierName: string;
  tierColor: string;
  breakdown: {
    tokenCount: number;
    migrationCount: number;
    rugCount: number;
    averageTokenScore: number;
  };
  scanDuration: number;
  /** Total tokens found before any limit applied */
  totalTokensFound: number;
  /** Whether results were limited due to MAX_AUTO_SCAN_TOKENS */
  tokensLimited: boolean;
}

/** Max tokens to auto-scan. Set high to capture full dev history. */
export const MAX_AUTO_SCAN_TOKENS = 500;
export const PROFILE_AUTO_SCAN_MAX_TOKENS = 100;
export const PROFILE_AUTO_SCAN_MAX_PAGES = 10;

export interface ScanOptions {
  /** Skip rug detection for faster results (default: true for speed) */
  skipRugDetection?: boolean;
  skipCache?: boolean;
  maxTokens?: number;
  verbose?: boolean;
  /** Maximum pages of transactions to scan (default: 10) */
  maxPages?: number;
}

/**
 * Scan a wallet for all created tokens and calculate scores
 *
 * @param walletAddress - The wallet address to scan
 * @param options - Optional scan configuration
 * @returns Complete scan result with all tokens and scores
 */
export async function scanWallet(
  walletAddress: string,
  options: ScanOptions = {}
): Promise<WalletScanResult> {
  const startTime = Date.now();
  const log = options.verbose ? console.log : () => {};

  // ===== CHECK CACHE FIRST =====
  if (!options.skipCache) {
    try {
      const cached = await getCachedWalletScan(walletAddress);
      if (cached) {
        log('Returning cached scan result');
        const tierInfo = getTierInfo(cached.tier as DevTier);
        return {
          walletAddress,
          tokensCreated: cached.tokensData as TokenWithScore[],
          totalScore: cached.totalScore,
          tier: cached.tier as DevTier,
          tierName: tierInfo.name,
          tierColor: tierInfo.color,
          breakdown: {
            tokenCount: cached.tokenCount,
            migrationCount: cached.migrationCount,
            rugCount: cached.rugCount,
            averageTokenScore: 0, // Not stored in cache, recalculate if needed
          },
          scanDuration: 0, // Cached result
          totalTokensFound: cached.totalTokensFound ?? cached.tokenCount,
          tokensLimited: cached.tokensLimited ?? false,
        };
      }
    } catch {
      log('Cache check failed, proceeding with fresh scan');
    }
  }

  // ===== STEP 1: Detect tokens created by wallet =====
  log('Step 1: Detecting created tokens...');
  const allCreatedTokens = await getTokensCreatedByWalletViaFeePayer(walletAddress, {
    maxPages: options.maxPages ?? PROFILE_AUTO_SCAN_MAX_PAGES,
  });
  const totalTokensFound = allCreatedTokens.length;
  log(`Found ${totalTokensFound} tokens`);

  if (totalTokensFound === 0) {
    return {
      walletAddress,
      tokensCreated: [],
      totalScore: 0,
      tier: 'ghost',
      tierName: 'GHOST',
      tierColor: 'var(--color-tier-ghost)',
      breakdown: {
        tokenCount: 0,
        migrationCount: 0,
        rugCount: 0,
        averageTokenScore: 0,
      },
      scanDuration: Date.now() - startTime,
      totalTokensFound: 0,
      tokensLimited: false,
    };
  }

  // Apply token limit (default to MAX_AUTO_SCAN_TOKENS)
  const limit = options.maxTokens ?? MAX_AUTO_SCAN_TOKENS;
  const tokensLimited = totalTokensFound > limit;
  let createdTokens = allCreatedTokens;

  if (tokensLimited) {
    // Sort by timestamp descending (most recent first) before limiting
    createdTokens = [...allCreatedTokens]
      .sort((a, b) => (b.creationTimestamp || 0) - (a.creationTimestamp || 0))
      .slice(0, limit);
    log(`Limited to ${limit} most recent tokens (${totalTokensFound} total found)`);
  }

  const mintAddresses = createdTokens.map(t => t.mintAddress);

  // ===== STEP 2: Batch fetch all data in parallel =====
  log('Step 2: Fetching market data, holder counts, dev holdings, and migration status...');

  const [marketDataMap, holderCountsMap, devHoldingsMap, migrationMap] = await Promise.all([
    batchGetTokenMarketData(mintAddresses),
    batchGetHolderCountsQuick(mintAddresses),
    batchGetDevHoldings(walletAddress, mintAddresses),
    batchDetectMigrations(mintAddresses.map(m => ({ mint: m, wallet: walletAddress }))),
  ]);

  // ===== STEP 3: Detect rugs (optional, SLOW - disabled by default) =====
  const rugResults = new Map<string, boolean>();
  // Default to skipping rug detection for speed - it's the slowest part
  const shouldDetectRugs = options.skipRugDetection === false;

  if (shouldDetectRugs) {
    log('Step 3: Detecting rugs (this may take a while)...');
    // Run rug detection in parallel batches - increased concurrency for dev plan
    const CONCURRENCY = 20;

    // Process all batches truly in parallel
    const batches: typeof createdTokens[] = [];
    for (let i = 0; i < createdTokens.length; i += CONCURRENCY) {
      batches.push(createdTokens.slice(i, i + CONCURRENCY));
    }

    const batchPromises = batches.map(async (batch) => {
      return Promise.all(
        batch.map(async (token) => {
          try {
            const result = await detectRugPattern(
              walletAddress,
              token.mintAddress,
              token.creationTimestamp
            );
            return { mint: token.mintAddress, isRug: result.isRug };
          } catch {
            return { mint: token.mintAddress, isRug: false };
          }
        })
      );
    });

    const allResults = await Promise.all(batchPromises);
    for (const batchResult of allResults) {
      for (const r of batchResult) {
        rugResults.set(r.mint, r.isRug);
      }
    }
  } else {
    log('Step 3: Skipping rug detection (use skipRugDetection: false to enable)');
  }

  // ===== STEP 4: Score each token =====
  log('Step 4: Scoring tokens...');
  const tokensWithScores: TokenWithScore[] = [];

  for (const token of createdTokens) {
    const market = marketDataMap.get(token.mintAddress);
    const holders = holderCountsMap.get(token.mintAddress) || 0;
    const devHolding = devHoldingsMap.get(token.mintAddress) || 0;
    const isRugged = rugResults.get(token.mintAddress) || false;

    // Use multi-source migration detection (GeckoTerminal > DexScreener > Helius swap)
    const migration = migrationMap.get(token.mintAddress);
    const isMigrated = migration?.migrated || false;
    const migrationDex = migration?.dexId || market?.dexId || null;

    const scoreResult = await calculateTokenScore({
      mintAddress: token.mintAddress,
      creatorWallet: walletAddress,
      launchDate: new Date((token.creationTimestamp || Date.now() / 1000) * 1000),
      isRugged,
      holderCount: holders,
      devHoldingPercent: devHolding,
      marketData: market ? {
        mintAddress: token.mintAddress,
        name: token.name,
        symbol: token.symbol,
        priceUsd: market.priceUsd ? parseFloat(market.priceUsd) : 0,
        priceChange24h: 0,
        volume24h: market.volume24h || 0,
        liquidity: market.liquidity || 0,
        marketCap: market.marketCap || 0,
        fdv: market.fdv || 0,
        totalBuys24h: 0,
        totalSells24h: 0,
        pairAddress: '',
        dexId: market.dexId || '',
        pairCreatedAt: market.pairCreatedAt ? new Date(market.pairCreatedAt) : new Date(),
        url: '',
        allPairs: [],
      } : null,
      migrationStatus: {
        migrated: isMigrated,
        migrationType: migrationDex && (DEX_CONFIG.MIGRATION_DEX_IDS as readonly string[]).includes(migrationDex.toLowerCase())
          ? migrationDex.toLowerCase() as MigrationDexType
          : null,
        pool: null,
        liquidityUsd: migration?.liquidityUsd || market?.liquidity || 0,
        migratedAt: migration?.migratedAt || (market?.pairCreatedAt ? new Date(market.pairCreatedAt) : null),
      },
    });

    tokensWithScores.push({
      mintAddress: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      launchedAt: token.creationTimestamp || Math.floor(Date.now() / 1000),
      migrated: isMigrated,
      marketCap: market?.marketCap || null,
      currentHolders: holders,
      devHoldingPercent: devHolding,
      isRugged,
      score: scoreResult.breakdown,
    });
  }

  // ===== STEP 5: Calculate total dev score =====
  log('Step 5: Calculating dev score...');
  const devScoreResult = calculateDevScore({
    tokens: tokensWithScores.map(t => ({
      score: t.score.total,
      migrated: t.migrated,
      launchDate: new Date(t.launchedAt * 1000),
      athMarketCap: t.marketCap || undefined,
      status: t.isRugged ? 'rug' as const : 'active' as const,
    })),
    walletCount: 1,
    accountCreatedAt: new Date(),
  });

  const tierInfo = getTierInfo(devScoreResult.tier);
  const migrationCount = tokensWithScores.filter(t => t.migrated).length;
  const rugCount = tokensWithScores.filter(t => t.isRugged).length;
  const validScores = tokensWithScores.filter(t => t.score.total >= 0);
  const averageTokenScore = validScores.length > 0
    ? validScores.reduce((sum, t) => sum + t.score.total, 0) / validScores.length
    : 0;

  log(`Scan complete in ${Date.now() - startTime}ms`);

  const result: WalletScanResult = {
    walletAddress,
    tokensCreated: tokensWithScores,
    totalScore: devScoreResult.score,
    tier: devScoreResult.tier,
    tierName: tierInfo.name,
    tierColor: tierInfo.color,
    breakdown: {
      tokenCount: tokensWithScores.length,
      migrationCount,
      rugCount,
      averageTokenScore: Math.round(averageTokenScore),
    },
    scanDuration: Date.now() - startTime,
    totalTokensFound,
    tokensLimited,
  };

  // ===== CACHE THE RESULT =====
  try {
    await setCachedWalletScan(walletAddress, {
      totalScore: result.totalScore,
      tier: result.tier,
      tokenCount: result.breakdown.tokenCount,
      migrationCount: result.breakdown.migrationCount,
      rugCount: result.breakdown.rugCount,
      tokensData: result.tokensCreated,
      totalTokensFound: result.totalTokensFound,
      tokensLimited: result.tokensLimited,
    });
  } catch {
    log('Failed to cache scan result');
  }

  return result;
}

/**
 * Quick scan - skips rug detection for faster results
 * This is now the DEFAULT behavior of scanWallet()
 */
export async function scanWalletQuick(
  walletAddress: string,
  options: ScanOptions = {}
): Promise<WalletScanResult> {
  return scanWallet(walletAddress, {
    maxPages: PROFILE_AUTO_SCAN_MAX_PAGES,
    maxTokens: PROFILE_AUTO_SCAN_MAX_TOKENS,
    ...options,
    skipRugDetection: true,
  });
}

/**
 * Full scan WITH rug detection (slower but comprehensive)
 * Use this when you need accurate rug/scam analysis
 */
export async function scanWalletWithRugDetection(
  walletAddress: string
): Promise<WalletScanResult> {
  return scanWallet(walletAddress, { skipRugDetection: false, verbose: true });
}

/**
 * Full scan with verbose logging (still skips rug detection by default)
 */
export async function scanWalletFull(
  walletAddress: string
): Promise<WalletScanResult> {
  return scanWallet(walletAddress, { verbose: true });
}

/**
 * Enrich existing scan result with rug detection data
 * Use this to lazily load rug data after initial fast load
 */
export async function enrichWithRugDetection(
  result: WalletScanResult,
  walletAddress: string
): Promise<WalletScanResult> {
  const rugResults = new Map<string, boolean>();
  const CONCURRENCY = 20;

  const batches: typeof result.tokensCreated[] = [];
  for (let i = 0; i < result.tokensCreated.length; i += CONCURRENCY) {
    batches.push(result.tokensCreated.slice(i, i + CONCURRENCY));
  }

  const batchPromises = batches.map(async (batch) => {
    return Promise.all(
      batch.map(async (token) => {
        try {
          const rugResult = await detectRugPattern(
            walletAddress,
            token.mintAddress,
            token.launchedAt
          );
          return { mint: token.mintAddress, isRug: rugResult.isRug };
        } catch {
          return { mint: token.mintAddress, isRug: false };
        }
      })
    );
  });

  const allResults = await Promise.all(batchPromises);
  for (const batchResult of allResults) {
    for (const r of batchResult) {
      rugResults.set(r.mint, r.isRug);
    }
  }

  // Update tokens with rug status
  const updatedTokens = result.tokensCreated.map(token => ({
    ...token,
    isRugged: rugResults.get(token.mintAddress) || false,
  }));

  const rugCount = updatedTokens.filter(t => t.isRugged).length;

  // Recalculate score with rug data
  const devScoreResult = calculateDevScore({
    tokens: updatedTokens.map(t => ({
      score: t.score.total,
      migrated: t.migrated,
      launchDate: new Date(t.launchedAt * 1000),
      athMarketCap: t.marketCap || undefined,
      status: t.isRugged ? 'rug' as const : 'active' as const,
    })),
    walletCount: 1,
    accountCreatedAt: new Date(),
  });

  const tierInfo = getTierInfo(devScoreResult.tier);

  return {
    ...result,
    tokensCreated: updatedTokens,
    totalScore: devScoreResult.score,
    tier: devScoreResult.tier,
    tierName: tierInfo.name,
    tierColor: tierInfo.color,
    breakdown: {
      ...result.breakdown,
      rugCount,
    },
  };
}

/**
 * Scan specific token CAs for a wallet
 * Used when user manually adds tokens they want featured
 *
 * @param walletAddress - The wallet to verify ownership
 * @param mintAddresses - Array of token mint addresses to scan
 * @returns Array of tokens with scores (only includes valid ones where wallet is creator)
 */
export async function scanSpecificTokens(
  walletAddress: string,
  mintAddresses: string[]
): Promise<TokenWithScore[]> {
  if (mintAddresses.length === 0) return [];

  // Fetch data for all requested tokens in parallel
  const [marketDataMap, holderCountsMap, devHoldingsMap, migrationMap] = await Promise.all([
    batchGetTokenMarketData(mintAddresses),
    batchGetHolderCountsQuick(mintAddresses),
    batchGetDevHoldings(walletAddress, mintAddresses),
    batchDetectMigrations(mintAddresses.map(m => ({ mint: m, wallet: walletAddress }))),
  ]);

  const tokensWithScores: TokenWithScore[] = [];

  for (const mintAddress of mintAddresses) {
    const market = marketDataMap.get(mintAddress);
    const holders = holderCountsMap.get(mintAddress) || 0;
    const devHolding = devHoldingsMap.get(mintAddress) || 0;
    const migration = migrationMap.get(mintAddress);
    const isMigrated = migration?.migrated || false;

    // Token name/symbol not available from market data APIs
    // Would require separate Helius DAS getAsset call to fetch metadata
    const name = 'Unknown';
    const symbol = '???';

    const scoreResult = await calculateTokenScore({
      mintAddress,
      creatorWallet: walletAddress,
      launchDate: market?.pairCreatedAt ? new Date(market.pairCreatedAt) : new Date(),
      isRugged: false,
      holderCount: holders,
      devHoldingPercent: devHolding,
      marketData: market ? {
        mintAddress,
        name,
        symbol,
        priceUsd: market.priceUsd ? parseFloat(market.priceUsd) : 0,
        priceChange24h: 0,
        volume24h: market.volume24h || 0,
        liquidity: market.liquidity || 0,
        marketCap: market.marketCap || 0,
        fdv: market.fdv || 0,
        totalBuys24h: 0,
        totalSells24h: 0,
        pairAddress: '',
        dexId: market.dexId || '',
        pairCreatedAt: market.pairCreatedAt ? new Date(market.pairCreatedAt) : new Date(),
        url: '',
        allPairs: [],
      } : null,
      migrationStatus: {
        migrated: isMigrated,
        migrationType: migration?.dexId && (DEX_CONFIG.MIGRATION_DEX_IDS as readonly string[]).includes(migration.dexId.toLowerCase())
          ? migration.dexId.toLowerCase() as MigrationDexType
          : null,
        pool: null,
        liquidityUsd: migration?.liquidityUsd || market?.liquidity || 0,
        migratedAt: migration?.migratedAt || null,
      },
    });

    tokensWithScores.push({
      mintAddress,
      name,
      symbol,
      launchedAt: market?.pairCreatedAt ? Math.floor(new Date(market.pairCreatedAt).getTime() / 1000) : Math.floor(Date.now() / 1000),
      migrated: isMigrated,
      marketCap: market?.marketCap || null,
      currentHolders: holders,
      devHoldingPercent: devHolding,
      isRugged: false,
      score: scoreResult.breakdown,
    });
  }

  return tokensWithScores;
}
