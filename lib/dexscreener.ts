/**
 * DexScreener API Client for market data
 * With GeckoTerminal fallback for tokens not indexed by DexScreener
 * 
 * DexScreener: No API key required, 300 requests/minute
 * GeckoTerminal: No API key required, 30 requests/minute
 */

// Cache implementation - 5 minute TTL
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting for DexScreener
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 300;

// Rate limiting for GeckoTerminal (more conservative)
const geckoRequestTimestamps: number[] = [];
const GECKO_MAX_REQUESTS_PER_MINUTE = 30;

import { DEX_CONFIG, MigrationDexType } from './constants';

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';
const GECKOTERMINAL_BASE_URL = 'https://api.geckoterminal.com/api/v2';

// Use centralized migration DEX list from constants
const MIGRATION_DEX_IDS: readonly string[] = DEX_CONFIG.MIGRATION_DEX_IDS;

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
  pairCreatedAt: number;
  txns: {
    h24: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    m5: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  boosts?: {
    active: number;
  };
}

export interface TokenMarketData {
  mintAddress: string;
  name: string;
  symbol: string;
  priceUsd: number;
  priceChange24h: number;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  athMarketCap?: number; // ATH market cap (if tracked)
  fdv: number;
  totalBuys24h: number;
  totalSells24h: number;
  pairAddress: string;
  dexId: string;
  pairCreatedAt: Date;
  url: string;
  allPairs: DexScreenerPair[];
}

export interface MigrationStatus {
  migrated: boolean;
  migrationType: MigrationDexType | null;
  pool: DexScreenerPair | null;
  liquidityUsd: number;
  migratedAt: Date | null;
  migrationPoolAddress?: string;
  graduationPercentage?: number;
}

export interface GeckoLaunchpadDetails {
  graduation_percentage: number;
  completed: boolean;
  completed_at: string | null;
  migrated_destination_pool_address: string | null;
}

// GeckoTerminal response types
interface GeckoTokenResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      price_usd: string;
      fdv_usd: string;
      market_cap_usd: string;
      total_reserve_in_usd: string;
      volume_usd: { h24: string };
      launchpad_details?: {
        graduation_percentage: number;
        completed: boolean;
        completed_at: string;
        migrated_destination_pool_address: string;
      };
    };
    relationships?: {
      top_pools?: {
        data: Array<{ id: string; type: string }>;
      };
    };
  };
}

interface GeckoPoolResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      address: string;
      name: string;
      base_token_price_usd: string;
      fdv_usd: string;
      market_cap_usd: string;
      reserve_in_usd: string;
      pool_created_at: string;
      volume_usd: { h24: string };
      price_change_percentage: { h24: string };
      transactions: {
        h24: { buys: number; sells: number };
      };
    };
    relationships?: {
      dex?: {
        data: { id: string; type: string };
      };
    };
  };
}

/**
 * Rate limiter for DexScreener API (300/min)
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove timestamps older than 1 minute
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneMinuteAgo) {
    requestTimestamps.shift();
  }

  // If at limit, wait
  if (requestTimestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    const waitTime = requestTimestamps[0] + 60000 - now;
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  requestTimestamps.push(Date.now());
  return fetch(url);
}

/**
 * Rate limiter for GeckoTerminal API (30/min - more conservative)
 */
async function geckoRateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // Remove timestamps older than 1 minute
  while (geckoRequestTimestamps.length > 0 && geckoRequestTimestamps[0] < oneMinuteAgo) {
    geckoRequestTimestamps.shift();
  }

  // If at limit, wait
  if (geckoRequestTimestamps.length >= GECKO_MAX_REQUESTS_PER_MINUTE) {
    const waitTime = geckoRequestTimestamps[0] + 60000 - now;
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  geckoRequestTimestamps.push(Date.now());
  return fetch(url, {
    headers: { 'Accept': 'application/json' }
  });
}

/**
 * Get cached data or fetch fresh
 */
async function cachedFetch<T>(cacheKey: string, fetchFn: () => Promise<T>): Promise<T> {
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.data as T;
  }

  const data = await fetchFn();
  cache.set(cacheKey, { data, timestamp: now });
  return data;
}

/**
 * Get market data for a token from DexScreener
 * Falls back to GeckoTerminal if DexScreener returns no data
 * Returns the primary (highest liquidity) pair data
 */
export async function getTokenMarketData(tokenAddress: string): Promise<TokenMarketData | null> {
  const cacheKey = `market:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    // Try DexScreener first
    const response = await rateLimitedFetch(
      `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${tokenAddress}`
    );

    if (response.ok) {
      const pairs: DexScreenerPair[] = await response.json();

      if (pairs && pairs.length > 0) {
        // Sort by liquidity to get the primary pair
        const sortedPairs = [...pairs].sort((a, b) =>
          (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
        );

        const primaryPair = sortedPairs[0];

        return {
          mintAddress: tokenAddress,
          name: primaryPair.baseToken.name,
          symbol: primaryPair.baseToken.symbol,
          priceUsd: parseFloat(primaryPair.priceUsd) || 0,
          priceChange24h: primaryPair.priceChange?.h24 || 0,
          volume24h: primaryPair.volume?.h24 || 0,
          liquidity: primaryPair.liquidity?.usd || 0,
          marketCap: primaryPair.marketCap || 0,
          fdv: primaryPair.fdv || 0,
          totalBuys24h: primaryPair.txns?.h24?.buys || 0,
          totalSells24h: primaryPair.txns?.h24?.sells || 0,
          pairAddress: primaryPair.pairAddress,
          dexId: primaryPair.dexId,
          pairCreatedAt: new Date(primaryPair.pairCreatedAt),
          url: primaryPair.url,
          allPairs: pairs,
        };
      }
    }

    // Fallback to GeckoTerminal
    return getTokenMarketDataFromGecko(tokenAddress);
  });
}

/**
 * Get market data from GeckoTerminal (fallback for DexScreener gaps)
 */
async function getTokenMarketDataFromGecko(tokenAddress: string): Promise<TokenMarketData | null> {
  try {
    const response = await geckoRateLimitedFetch(
      `${GECKOTERMINAL_BASE_URL}/networks/solana/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      return null;
    }

    const data: GeckoTokenResponse = await response.json();
    const attrs = data.data?.attributes;

    if (!attrs) {
      return null;
    }

    // Get pool details if available
    let poolAddress = '';
    let dexId = '';
    let pairCreatedAt = new Date();

    if (attrs.launchpad_details?.migrated_destination_pool_address) {
      poolAddress = attrs.launchpad_details.migrated_destination_pool_address;

      // Fetch pool details for more info
      try {
        const poolResponse = await geckoRateLimitedFetch(
          `${GECKOTERMINAL_BASE_URL}/networks/solana/pools/${poolAddress}`
        );

        if (poolResponse.ok) {
          const poolData: GeckoPoolResponse = await poolResponse.json();
          dexId = poolData.data?.relationships?.dex?.data?.id || 'unknown';
          if (poolData.data?.attributes?.pool_created_at) {
            pairCreatedAt = new Date(poolData.data.attributes.pool_created_at);
          }
        }
      } catch {
        // Pool fetch failed, continue with what we have
      }
    }

    return {
      mintAddress: tokenAddress,
      name: attrs.name || 'Unknown',
      symbol: attrs.symbol || '???',
      priceUsd: parseFloat(attrs.price_usd) || 0,
      priceChange24h: 0, // GeckoTerminal token endpoint doesn't include this
      volume24h: parseFloat(attrs.volume_usd?.h24) || 0,
      liquidity: parseFloat(attrs.total_reserve_in_usd) || 0,
      marketCap: parseFloat(attrs.market_cap_usd) || 0,
      fdv: parseFloat(attrs.fdv_usd) || 0,
      totalBuys24h: 0,
      totalSells24h: 0,
      pairAddress: poolAddress,
      dexId: dexId,
      pairCreatedAt: pairCreatedAt,
      url: `https://www.geckoterminal.com/solana/tokens/${tokenAddress}`,
      allPairs: [], // GeckoTerminal doesn't return DexScreenerPair format
    };
  } catch (error) {
    console.error('GeckoTerminal fallback error:', error);
    return null;
  }
}

/**
 * Get all trading pairs/pools for a token
 */
export async function getTokenPools(tokenAddress: string): Promise<DexScreenerPair[]> {
  const cacheKey = `pools:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    let retries = 3;
    let delay = 1000;
    
    while (retries > 0) {
      const response = await rateLimitedFetch(
        `${DEXSCREENER_BASE_URL}/token-pairs/v1/solana/${tokenAddress}`
      );

      if (response.ok) {
        return response.json();
      }
      
      if (response.status === 404) {
        return [];
      }
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        retries--;
        if (retries > 0) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2; // Exponential backoff
          continue;
        }
      }
      
      throw new Error(`DexScreener API error: ${response.status}`);
    }
    
    return [];
  });
}

/**
 * Check if token has migrated from pump.fun to a DEX
 * Migration is confirmed when token has liquidity on Raydium, PumpSwap, etc.
 * Falls back to GeckoTerminal if DexScreener has no pools
 */
export async function checkMigrationStatus(tokenAddress: string): Promise<MigrationStatus> {
  const cacheKey = `migration:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    const pools = await getTokenPools(tokenAddress);

    if (!pools || pools.length === 0) {
      // Fallback to GeckoTerminal for migration status
      return checkMigrationStatusFromGecko(tokenAddress);
    }

    // Find ALL pools on migration DEXes (no liquidity threshold)
    const migrationPools = pools.filter(pool =>
      MIGRATION_DEX_IDS.includes(pool.dexId.toLowerCase())
    );

    if (migrationPools.length === 0) {
      return {
        migrated: false,
        migrationType: null,
        pool: null,
        liquidityUsd: 0,
        migratedAt: null,
      };
    }

    // Sort by liquidity to get primary migration pool
    const primaryPool = migrationPools.sort((a, b) =>
      (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
    )[0];

    return {
      migrated: true,
      migrationType: normalizeDexId(primaryPool.dexId),
      pool: primaryPool,
      liquidityUsd: primaryPool.liquidity?.usd || 0,
      migratedAt: primaryPool.pairCreatedAt ? new Date(primaryPool.pairCreatedAt) : null,
    };
  });
}

/**
 * Check migration status from GeckoTerminal (fallback)
 */
async function checkMigrationStatusFromGecko(tokenAddress: string): Promise<MigrationStatus> {
  try {
    const response = await geckoRateLimitedFetch(
      `${GECKOTERMINAL_BASE_URL}/networks/solana/tokens/${tokenAddress}`
    );

    if (!response.ok) {
      return {
        migrated: false,
        migrationType: null,
        pool: null,
        liquidityUsd: 0,
        migratedAt: null,
      };
    }

    const data: GeckoTokenResponse = await response.json();
    const launchpad = data.data?.attributes?.launchpad_details;

    if (!launchpad?.completed || !launchpad?.migrated_destination_pool_address) {
      return {
        migrated: false,
        migrationType: null,
        pool: null,
        liquidityUsd: 0,
        migratedAt: null,
      };
    }

    // Fetch pool details to get DEX type and liquidity
    const poolAddress = launchpad.migrated_destination_pool_address;
    let dexId = '';
    let liquidityUsd = 0;

    try {
      const poolResponse = await geckoRateLimitedFetch(
        `${GECKOTERMINAL_BASE_URL}/networks/solana/pools/${poolAddress}`
      );

      if (poolResponse.ok) {
        const poolData: GeckoPoolResponse = await poolResponse.json();
        dexId = poolData.data?.relationships?.dex?.data?.id || '';
        liquidityUsd = parseFloat(poolData.data?.attributes?.reserve_in_usd || '0');
      }
    } catch {
      // Pool fetch failed, continue with what we have
    }

    return {
      migrated: true,
      migrationType: normalizeDexId(dexId),
      pool: null, // Can't create DexScreenerPair from Gecko data
      liquidityUsd: liquidityUsd,
      migratedAt: launchpad.completed_at ? new Date(launchpad.completed_at) : null,
    };
  } catch (error) {
    console.error('GeckoTerminal migration check error:', error);
    return {
      migrated: false,
      migrationType: null,
      pool: null,
      liquidityUsd: 0,
      migratedAt: null,
    };
  }
}

/**
 * Normalize DEX ID to our migration type enum
 */
function normalizeDexId(dexId: string): MigrationDexType | null {
  const normalized = dexId.toLowerCase();
  if (MIGRATION_DEX_IDS.includes(normalized)) {
    return normalized as MigrationDexType;
  }
  return null;
}

/**
 * Search for tokens by name or symbol
 */
export async function searchTokens(query: string): Promise<DexScreenerPair[]> {
  const response = await rateLimitedFetch(
    `${DEXSCREENER_BASE_URL}/latest/dex/search?q=${encodeURIComponent(query)}`
  );

  if (!response.ok) {
    throw new Error(`DexScreener API error: ${response.status}`);
  }

  const data = await response.json();

  // Filter to only Solana tokens
  return (data.pairs || []).filter((pair: DexScreenerPair) => pair.chainId === 'solana');
}

/**
 * Get boosted tokens (promoted on DexScreener)
 */
export async function getBoostedTokens(): Promise<DexScreenerPair[]> {
  const response = await rateLimitedFetch(
    `${DEXSCREENER_BASE_URL}/token-boosts/top/v1`
  );

  if (!response.ok) {
    throw new Error(`DexScreener API error: ${response.status}`);
  }

  const data = await response.json();

  // Filter to only Solana tokens
  return (data || []).filter((token: DexScreenerPair) => token.chainId === 'solana');
}

/**
 * Helper to chunk arrays for batch processing
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Simplified batch market data response for faster processing
 */
export interface BatchTokenMarketData {
  mintAddress: string;
  priceUsd: string | null;
  marketCap: number | null;
  fdv: number | null;
  liquidity: number | null;
  volume24h: number | null;
  pairCreatedAt: number | null;
  dexId: string | null;
  migrated: boolean;
}

/**
 * Fetch a single batch of tokens from DexScreener
 */
async function fetchTokenBatch(
  mints: string[]
): Promise<Map<string, BatchTokenMarketData>> {
  const results = new Map<string, BatchTokenMarketData>();

  const mintsParam = mints.join(',');
  const url = `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${mintsParam}`;

  try {
    const response = await rateLimitedFetch(url);

    if (!response.ok) {
      // Return empty data for all mints
      for (const mint of mints) {
        results.set(mint, {
          mintAddress: mint,
          priceUsd: null,
          marketCap: null,
          fdv: null,
          liquidity: null,
          volume24h: null,
          pairCreatedAt: null,
          dexId: null,
          migrated: false,
        });
      }
      return results;
    }

    const pairs: DexScreenerPair[] = await response.json();

    // Group pairs by token to check ALL pools for migration
    const pairsByToken = new Map<string, DexScreenerPair[]>();
    for (const pair of pairs) {
      const mint = pair.baseToken?.address;
      if (!mint) continue;
      if (!pairsByToken.has(mint)) {
        pairsByToken.set(mint, []);
      }
      pairsByToken.get(mint)!.push(pair);
    }

    // Process each token's pairs
    for (const [mint, tokenPairs] of pairsByToken) {
      // Sort by liquidity to get the highest liquidity pair for market data
      const sortedPairs = [...tokenPairs].sort(
        (a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      const primaryPair = sortedPairs[0];

      // Check if ANY pair is on a migration DEX (no liquidity threshold)
      const isMigrated = tokenPairs.some((pair) =>
        MIGRATION_DEX_IDS.includes(pair.dexId?.toLowerCase() || '')
      );

      // Find the migration DEX if migrated
      const migrationPair = tokenPairs.find((pair) =>
        MIGRATION_DEX_IDS.includes(pair.dexId?.toLowerCase() || '')
      );

      results.set(mint, {
        mintAddress: mint,
        priceUsd: primaryPair.priceUsd,
        marketCap: primaryPair.marketCap || null,
        fdv: primaryPair.fdv || null,
        liquidity: primaryPair.liquidity?.usd || null,
        volume24h: primaryPair.volume?.h24 || null,
        pairCreatedAt: primaryPair.pairCreatedAt || null,
        dexId: migrationPair?.dexId || primaryPair.dexId || null,
        migrated: isMigrated,
      });
    }
  } catch (error) {
    console.error('DexScreener batch fetch error:', error);
  }

  // Fill in empty entries for mints with no data
  for (const mint of mints) {
    if (!results.has(mint)) {
      results.set(mint, {
        mintAddress: mint,
        priceUsd: null,
        marketCap: null,
        fdv: null,
        liquidity: null,
        volume24h: null,
        pairCreatedAt: null,
        dexId: null,
        migrated: false,
      });
    }
  }

  return results;
}

/**
 * Get batch market data for multiple tokens - FAST version
 * Uses parallel batch requests (30 tokens per request)
 *
 * @param mintAddresses - Array of token mint addresses
 * @returns Map of mint address to simplified market data
 */
export async function batchGetTokenMarketData(
  mintAddresses: string[]
): Promise<Map<string, BatchTokenMarketData>> {
  const results = new Map<string, BatchTokenMarketData>();

  if (mintAddresses.length === 0) {
    return results;
  }

  // DexScreener allows up to 30 addresses per request
  const BATCH_SIZE = 30;
  const batches = chunkArray(mintAddresses, BATCH_SIZE);

  // Process batches in parallel (respects rate limit via rateLimitedFetch)
  const batchResults = await Promise.all(
    batches.map(batch => fetchTokenBatch(batch))
  );

  // Merge results
  for (const batchResult of batchResults) {
    for (const [mint, data] of batchResult) {
      results.set(mint, data);
    }
  }

  return results;
}

/**
 * Get multiple tokens market data in batch (full data version)
 * DexScreener allows comma-separated addresses (up to 30)
 * Now processes batches in parallel for better performance
 */
export async function getMultipleTokensMarketData(
  tokenAddresses: string[]
): Promise<Map<string, TokenMarketData | null>> {
  const BATCH_SIZE = 30;
  const batches = chunkArray(tokenAddresses, BATCH_SIZE);

  // Process batch and return results
  async function processBatch(batch: string[]): Promise<Map<string, TokenMarketData | null>> {
    const batchResults = new Map<string, TokenMarketData | null>();
    const addressList = batch.join(',');

    const response = await rateLimitedFetch(
      `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${addressList}`
    );

    if (!response.ok) {
      batch.forEach(addr => batchResults.set(addr, null));
      return batchResults;
    }

    const pairs: DexScreenerPair[] = await response.json();

    // Group pairs by token address
    const pairsByToken = new Map<string, DexScreenerPair[]>();
    for (const pair of pairs) {
      const addr = pair.baseToken.address;
      if (!pairsByToken.has(addr)) {
        pairsByToken.set(addr, []);
      }
      pairsByToken.get(addr)!.push(pair);
    }

    // Process each token
    for (const address of batch) {
      const tokenPairs = pairsByToken.get(address);

      if (!tokenPairs || tokenPairs.length === 0) {
        batchResults.set(address, null);
        continue;
      }

      // Sort by liquidity
      const sorted = tokenPairs.sort((a, b) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );

      const primary = sorted[0];

      batchResults.set(address, {
        mintAddress: address,
        name: primary.baseToken.name,
        symbol: primary.baseToken.symbol,
        priceUsd: parseFloat(primary.priceUsd) || 0,
        priceChange24h: primary.priceChange?.h24 || 0,
        volume24h: primary.volume?.h24 || 0,
        liquidity: primary.liquidity?.usd || 0,
        marketCap: primary.marketCap || 0,
        fdv: primary.fdv || 0,
        totalBuys24h: primary.txns?.h24?.buys || 0,
        totalSells24h: primary.txns?.h24?.sells || 0,
        pairAddress: primary.pairAddress,
        dexId: primary.dexId,
        pairCreatedAt: new Date(primary.pairCreatedAt),
        url: primary.url,
        allPairs: tokenPairs,
      });
    }

    return batchResults;
  }

  // Process all batches in parallel
  const allBatchResults = await Promise.all(batches.map(processBatch));

  // Merge results
  const results = new Map<string, TokenMarketData | null>();
  for (const batchResult of allBatchResults) {
    for (const [addr, data] of batchResult) {
      results.set(addr, data);
    }
  }

  return results;
}

/**
 * Get explicit graduation/migration status from GeckoTerminal
 * This is more reliable than pool existence checks because GeckoTerminal
 * tracks pump.fun graduation explicitly via launchpad_details.completed
 *
 * @param tokenAddress - The token mint address
 * @returns Migration status with explicit graduation data
 */
export async function getGeckoTerminalMigrationStatus(tokenAddress: string): Promise<MigrationStatus> {
  const cacheKey = `gecko-migration:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    try {
      const response = await geckoRateLimitedFetch(
        `${GECKOTERMINAL_BASE_URL}/networks/solana/tokens/${tokenAddress}`
      );

      if (!response.ok) {
        return {
          migrated: false,
          migrationType: null,
          pool: null,
          liquidityUsd: 0,
          migratedAt: null,
        };
      }

      const data: GeckoTokenResponse = await response.json();
      const launchpad = data.data?.attributes?.launchpad_details;

      // If no launchpad details, it's not a pump.fun token or not tracked
      if (!launchpad) {
        // Try checking for pools anyway
        return checkMigrationStatusFromGecko(tokenAddress);
      }

      // Explicit graduation check - this is the most reliable indicator
      if (!launchpad.completed) {
        return {
          migrated: false,
          migrationType: null,
          pool: null,
          liquidityUsd: 0,
          migratedAt: null,
          graduationPercentage: launchpad.graduation_percentage,
        };
      }

      // Token has graduated from pump.fun bonding curve
      const poolAddress = launchpad.migrated_destination_pool_address;
      let dexId = '';
      let liquidityUsd = 0;

      // Get pool details if available
      if (poolAddress) {
        try {
          const poolResponse = await geckoRateLimitedFetch(
            `${GECKOTERMINAL_BASE_URL}/networks/solana/pools/${poolAddress}`
          );

          if (poolResponse.ok) {
            const poolData: GeckoPoolResponse = await poolResponse.json();
            dexId = poolData.data?.relationships?.dex?.data?.id || '';
            liquidityUsd = parseFloat(poolData.data?.attributes?.reserve_in_usd || '0');
          }
        } catch {
          // Pool fetch failed, continue with what we have
        }
      }

      return {
        migrated: true,
        migrationType: normalizeDexId(dexId),
        pool: null, // Can't create DexScreenerPair from Gecko data
        liquidityUsd: liquidityUsd,
        migratedAt: launchpad.completed_at ? new Date(launchpad.completed_at) : null,
        migrationPoolAddress: poolAddress || undefined,
        graduationPercentage: 100, // Completed = 100%
      };
    } catch (error) {
      console.error('GeckoTerminal migration status error:', error);
      return {
        migrated: false,
        migrationType: null,
        pool: null,
        liquidityUsd: 0,
        migratedAt: null,
      };
    }
  });
}

/**
 * Get comprehensive migration status using both DexScreener and GeckoTerminal
 * Prefers GeckoTerminal for pump.fun tokens due to explicit graduation tracking
 *
 * @param tokenAddress - The token mint address
 * @returns Combined migration status from best available source
 */
export async function getMigrationStatusCombined(tokenAddress: string): Promise<MigrationStatus> {
  // For pump.fun tokens (ending in 'pump'), prefer GeckoTerminal
  const isPumpToken = tokenAddress.endsWith('pump');

  if (isPumpToken) {
    const geckoStatus = await getGeckoTerminalMigrationStatus(tokenAddress);
    if (geckoStatus.migrated || geckoStatus.graduationPercentage !== undefined) {
      return geckoStatus;
    }
  }

  // Fall back to DexScreener-based check
  return checkMigrationStatus(tokenAddress);
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  cache.clear();
}
