/**
 * DexScreener API Client for market data
 * No API key required for public endpoints
 * Rate limit: 300 requests/minute
 */

// Cache implementation - 5 minute TTL
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_MINUTE = 300;

const DEXSCREENER_BASE_URL = 'https://api.dexscreener.com';

// Raydium and PumpSwap DEX identifiers
const MIGRATION_DEX_IDS = ['raydium', 'pumpswap', 'pump', 'orca', 'meteora'];
const MINIMUM_LIQUIDITY_FOR_MIGRATION = 10000; // $10K USD minimum

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
  migrationType: 'raydium' | 'pumpswap' | 'orca' | 'meteora' | null;
  pool: DexScreenerPair | null;
  liquidityUsd: number;
  migratedAt: Date | null;
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
 * Returns the primary (highest liquidity) pair data
 */
export async function getTokenMarketData(tokenAddress: string): Promise<TokenMarketData | null> {
  const cacheKey = `market:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    const response = await rateLimitedFetch(
      `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${tokenAddress}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`DexScreener API error: ${response.status}`);
    }

    const pairs: DexScreenerPair[] = await response.json();

    if (!pairs || pairs.length === 0) {
      return null;
    }

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
  });
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
 */
export async function checkMigrationStatus(tokenAddress: string): Promise<MigrationStatus> {
  const cacheKey = `migration:${tokenAddress}`;

  return cachedFetch(cacheKey, async () => {
    const pools = await getTokenPools(tokenAddress);

    if (!pools || pools.length === 0) {
      return {
        migrated: false,
        migrationType: null,
        pool: null,
        liquidityUsd: 0,
        migratedAt: null,
      };
    }

    // Find pools on migration DEXes with sufficient liquidity
    const migrationPools = pools.filter(pool =>
      MIGRATION_DEX_IDS.includes(pool.dexId.toLowerCase()) &&
      (pool.liquidity?.usd || 0) >= MINIMUM_LIQUIDITY_FOR_MIGRATION
    );

    if (migrationPools.length === 0) {
      // Check if any pools exist at all (might be low liquidity)
      const anyDexPool = pools.find(pool =>
        MIGRATION_DEX_IDS.includes(pool.dexId.toLowerCase())
      );

      if (anyDexPool) {
        return {
          migrated: true,
          migrationType: normalizeDexId(anyDexPool.dexId),
          pool: anyDexPool,
          liquidityUsd: anyDexPool.liquidity?.usd || 0,
          migratedAt: anyDexPool.pairCreatedAt ? new Date(anyDexPool.pairCreatedAt) : null,
        };
      }

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
 * Normalize DEX ID to our migration type enum
 */
function normalizeDexId(dexId: string): 'raydium' | 'pumpswap' | 'orca' | 'meteora' | null {
  const normalized = dexId.toLowerCase();
  if (normalized === 'raydium') return 'raydium';
  if (normalized === 'pumpswap' || normalized === 'pump') return 'pumpswap';
  if (normalized === 'orca') return 'orca';
  if (normalized === 'meteora') return 'meteora';
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
 * Get multiple tokens market data in batch
 * DexScreener allows comma-separated addresses (up to 30)
 */
export async function getMultipleTokensMarketData(
  tokenAddresses: string[]
): Promise<Map<string, TokenMarketData | null>> {
  const BATCH_SIZE = 30;
  const results = new Map<string, TokenMarketData | null>();

  // Process in batches
  for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
    const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
    const addressList = batch.join(',');

    const response = await rateLimitedFetch(
      `${DEXSCREENER_BASE_URL}/tokens/v1/solana/${addressList}`
    );

    if (!response.ok) {
      // Mark all as null for this batch
      batch.forEach(addr => results.set(addr, null));
      continue;
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
        results.set(address, null);
        continue;
      }

      // Sort by liquidity
      const sorted = tokenPairs.sort((a, b) =>
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );

      const primary = sorted[0];

      results.set(address, {
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
  }

  return results;
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  cache.clear();
}
