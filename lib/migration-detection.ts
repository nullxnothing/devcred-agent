/**
 * Multi-Source Migration Detection Module
 *
 * Detects token migrations from pump.fun bonding curve to DEXes using:
 * 1. GeckoTerminal - Most reliable for pump.fun (explicit launchpad_details.completed flag)
 * 2. DexScreener - Check ALL pools, not just highest liquidity (NO $10K threshold)
 * 3. Helius swap history - Check for DEX swaps as fallback
 *
 * A token is considered migrated if ANY source confirms migration.
 */

import { getMigratedTokensFromSwapHistory, MigratedTokenInfo } from './helius';
import { DEX_CONFIG } from './constants';

const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2';
const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

// Use centralized migration DEX list from constants
const MIGRATION_DEX_IDS: Set<string> = new Set(DEX_CONFIG.MIGRATION_DEX_IDS);

// Rate limiting for GeckoTerminal (30/min)
const geckoTimestamps: number[] = [];
const GECKO_MAX_PER_MIN = 30;

// Rate limiting for DexScreener (300/min)
const dexTimestamps: number[] = [];
const DEX_MAX_PER_MIN = 300;

export interface MigrationResult {
  migrated: boolean;
  source: 'geckoterminal' | 'dexscreener' | 'helius_swap' | null;
  dexId: string | null;
  liquidityUsd: number;
  migratedAt: Date | null;
  poolAddress: string | null;
  graduationPercentage?: number;
}

interface GeckoTokenResponse {
  data: {
    attributes: {
      launchpad_details?: {
        graduation_percentage: number;
        completed: boolean;
        completed_at: string | null;
        migrated_destination_pool_address: string | null;
      };
    };
  };
}

interface DexScreenerPair {
  dexId: string;
  pairAddress: string;
  liquidity?: { usd: number };
  pairCreatedAt?: number;
  baseToken?: { address: string };
}

async function rateLimitedGeckoFetch(url: string): Promise<Response> {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  while (geckoTimestamps.length > 0 && geckoTimestamps[0] < oneMinAgo) {
    geckoTimestamps.shift();
  }

  if (geckoTimestamps.length >= GECKO_MAX_PER_MIN) {
    const waitTime = geckoTimestamps[0] + 60000 - now;
    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  geckoTimestamps.push(Date.now());
  return fetch(url, { headers: { Accept: 'application/json' } });
}

async function rateLimitedDexFetch(url: string): Promise<Response> {
  const now = Date.now();
  const oneMinAgo = now - 60000;

  while (dexTimestamps.length > 0 && dexTimestamps[0] < oneMinAgo) {
    dexTimestamps.shift();
  }

  if (dexTimestamps.length >= DEX_MAX_PER_MIN) {
    const waitTime = dexTimestamps[0] + 60000 - now;
    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
  }

  dexTimestamps.push(Date.now());
  return fetch(url);
}

/**
 * Check migration via GeckoTerminal (most reliable for pump.fun tokens)
 * Uses explicit launchpad_details.completed flag
 */
async function checkMigrationViaGecko(
  tokenAddress: string
): Promise<MigrationResult> {
  try {
    const response = await rateLimitedGeckoFetch(
      `${GECKOTERMINAL_BASE_URL}/networks/solana/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      return createEmptyResult();
    }

    const data: GeckoTokenResponse = await response.json();
    const launchpad = data.data?.attributes?.launchpad_details;

    if (!launchpad) {
      return createEmptyResult();
    }

    // Explicit graduation check - most reliable indicator
    if (launchpad.completed) {
      return {
        migrated: true,
        source: 'geckoterminal',
        dexId: null, // Would need additional pool fetch to get DEX ID
        liquidityUsd: 0,
        migratedAt: launchpad.completed_at
          ? new Date(launchpad.completed_at)
          : null,
        poolAddress: launchpad.migrated_destination_pool_address,
        graduationPercentage: 100,
      };
    }

    // Not yet graduated - return graduation percentage for reference
    return {
      migrated: false,
      source: null,
      dexId: null,
      liquidityUsd: 0,
      migratedAt: null,
      poolAddress: null,
      graduationPercentage: launchpad.graduation_percentage,
    };
  } catch {
    return createEmptyResult();
  }
}

/**
 * Check migration via DexScreener token-pairs endpoint
 * Checks ALL pools (not just highest liquidity) with NO $10K threshold
 */
async function checkMigrationViaDexScreener(
  tokenAddress: string
): Promise<MigrationResult> {
  try {
    const response = await rateLimitedDexFetch(
      `${DEXSCREENER_BASE_URL}/token-pairs/v1/solana/${tokenAddress}`
    );

    if (!response.ok) {
      return createEmptyResult();
    }

    const pairs: DexScreenerPair[] = await response.json();

    if (!pairs || pairs.length === 0) {
      return createEmptyResult();
    }

    // Check if ANY pool exists on a migration DEX (NO liquidity threshold)
    for (const pair of pairs) {
      const dexId = (pair.dexId || '').toLowerCase();

      if (MIGRATION_DEX_IDS.has(dexId)) {
        return {
          migrated: true,
          source: 'dexscreener',
          dexId,
          liquidityUsd: pair.liquidity?.usd || 0,
          migratedAt: pair.pairCreatedAt
            ? new Date(pair.pairCreatedAt)
            : null,
          poolAddress: pair.pairAddress,
        };
      }
    }

    return createEmptyResult();
  } catch {
    return createEmptyResult();
  }
}

function createEmptyResult(): MigrationResult {
  return {
    migrated: false,
    source: null,
    dexId: null,
    liquidityUsd: 0,
    migratedAt: null,
    poolAddress: null,
  };
}

/**
 * Detect migration using multiple sources
 * Priority: GeckoTerminal > DexScreener > Helius swap history
 * Returns migrated: true if ANY source confirms
 */
export async function detectMigration(
  tokenAddress: string,
  walletAddress?: string
): Promise<MigrationResult> {
  // Source 1: GeckoTerminal (most reliable for pump.fun)
  const geckoResult = await checkMigrationViaGecko(tokenAddress);
  if (geckoResult.migrated) {
    return geckoResult;
  }

  // Source 2: DexScreener (check all pools, no threshold)
  const dexResult = await checkMigrationViaDexScreener(tokenAddress);
  if (dexResult.migrated) {
    return dexResult;
  }

  // Source 3: Helius swap history (if wallet provided)
  if (walletAddress) {
    const swapHistory = await getMigratedTokensFromSwapHistory(
      walletAddress,
      new Set([tokenAddress])
    );

    const swapInfo = swapHistory.get(tokenAddress);
    if (swapInfo) {
      return {
        migrated: true,
        source: 'helius_swap',
        dexId: swapInfo.dexSource.toLowerCase(),
        liquidityUsd: 0,
        migratedAt: new Date(swapInfo.firstSwapTimestamp * 1000),
        poolAddress: null,
      };
    }
  }

  // No migration detected - preserve graduation percentage if available
  return geckoResult.graduationPercentage !== undefined
    ? geckoResult
    : createEmptyResult();
}

/**
 * Batch detect migrations for multiple tokens
 * Optimized for performance with parallel API calls
 */
export async function batchDetectMigrations(
  tokens: Array<{ mint: string; wallet?: string }>
): Promise<Map<string, MigrationResult>> {
  const results = new Map<string, MigrationResult>();

  if (tokens.length === 0) {
    return results;
  }

  // Get unique wallet address (usually same for all tokens in a scan)
  const walletAddress = tokens.find((t) => t.wallet)?.wallet;

  // Step 1: Batch check via Helius swap history (most efficient for batch)
  // This scans wallet transactions once for all tokens
  if (walletAddress) {
    const mintSet = new Set(tokens.map((t) => t.mint));
    const swapHistory = await getMigratedTokensFromSwapHistory(
      walletAddress,
      mintSet
    );

    for (const [mint, info] of swapHistory) {
      results.set(mint, {
        migrated: true,
        source: 'helius_swap',
        dexId: info.dexSource.toLowerCase(),
        liquidityUsd: 0,
        migratedAt: new Date(info.firstSwapTimestamp * 1000),
        poolAddress: null,
      });
    }
  }

  // Step 2: For tokens not found in swap history, check DexScreener in batch
  // DexScreener allows comma-separated addresses (up to 30)
  const unmatchedMints = tokens
    .map((t) => t.mint)
    .filter((m) => !results.has(m));

  if (unmatchedMints.length > 0) {
    const BATCH_SIZE = 30;
    const batches: string[][] = [];

    for (let i = 0; i < unmatchedMints.length; i += BATCH_SIZE) {
      batches.push(unmatchedMints.slice(i, i + BATCH_SIZE));
    }

    const batchPromises = batches.map(async (batch) => {
      const batchResults = new Map<string, MigrationResult>();

      try {
        const mintsParam = batch.join(',');
        const response = await rateLimitedDexFetch(
          `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${mintsParam}`
        );

        if (response.ok) {
          const pairs: DexScreenerPair[] = await response.json();

          // Group pairs by token
          const pairsByToken = new Map<string, DexScreenerPair[]>();
          for (const pair of pairs) {
            const mint = pair.baseToken?.address;
            if (!mint) continue;
            if (!pairsByToken.has(mint)) {
              pairsByToken.set(mint, []);
            }
            pairsByToken.get(mint)!.push(pair);
          }

          // Check each token's pairs for migration DEX
          for (const [mint, tokenPairs] of pairsByToken) {
            for (const pair of tokenPairs) {
              const dexId = (pair.dexId || '').toLowerCase();

              if (MIGRATION_DEX_IDS.has(dexId)) {
                batchResults.set(mint, {
                  migrated: true,
                  source: 'dexscreener',
                  dexId,
                  liquidityUsd: pair.liquidity?.usd || 0,
                  migratedAt: pair.pairCreatedAt
                    ? new Date(pair.pairCreatedAt)
                    : null,
                  poolAddress: pair.pairAddress,
                });
                break; // Found migration, no need to check more pairs
              }
            }
          }
        }
      } catch {
        // Batch failed, continue with other batches
      }

      return batchResults;
    });

    const batchResults = await Promise.all(batchPromises);
    for (const batchResult of batchResults) {
      for (const [mint, result] of batchResult) {
        if (!results.has(mint)) {
          results.set(mint, result);
        }
      }
    }
  }

  // Step 3: For remaining tokens, check GeckoTerminal individually
  // This is rate-limited so we process in smaller batches
  const stillUnmatched = tokens
    .map((t) => t.mint)
    .filter((m) => !results.has(m));

  // Only check GeckoTerminal for pump.fun tokens (ending in 'pump')
  const pumpTokens = stillUnmatched.filter((m) => m.endsWith('pump'));

  if (pumpTokens.length > 0) {
    // Process in batches of 5 to respect rate limits
    const GECKO_BATCH_SIZE = 5;

    for (let i = 0; i < pumpTokens.length; i += GECKO_BATCH_SIZE) {
      const batch = pumpTokens.slice(i, i + GECKO_BATCH_SIZE);
      const geckoPromises = batch.map((mint) => checkMigrationViaGecko(mint));
      const geckoResults = await Promise.all(geckoPromises);

      for (let j = 0; j < batch.length; j++) {
        const mint = batch[j];
        const result = geckoResults[j];
        if (result.migrated || result.graduationPercentage !== undefined) {
          results.set(mint, result);
        }
      }
    }
  }

  // Fill in empty results for any tokens not found
  for (const token of tokens) {
    if (!results.has(token.mint)) {
      results.set(token.mint, createEmptyResult());
    }
  }

  return results;
}
