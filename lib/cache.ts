/**
 * Caching Layer for DevCred
 *
 * Multi-tier caching:
 * 1. In-memory cache for hot data (market prices, holder counts)
 * 2. Database cache for cold data (token creations, wallet scans)
 *
 * In production, replace in-memory cache with Redis for horizontal scaling.
 */

import { pool } from './db';

// TTL constants by data type
export const CACHE_TTL = {
  marketData: 5 * 60 * 1000,           // 5 minutes for price/mcap
  holderCount: 30 * 60 * 1000,         // 30 minutes for holder counts
  devHoldings: 15 * 60 * 1000,         // 15 minutes for dev holding %
  tokenCreations: 24 * 60 * 60 * 1000, // 24 hours for what tokens wallet created
  walletScan: 60 * 60 * 1000,          // 1 hour for full wallet scan results
  migrationStatus: 10 * 60 * 1000,     // 10 minutes for migration status (fast graduations)
} as const;

// ============================================================
// IN-MEMORY CACHE (for hot data)
// ============================================================

interface CachedData<T> {
  data: T;
  cachedAt: number;
  ttl: number;
}

// Separate caches for different data types
const marketDataCache = new Map<string, CachedData<unknown>>();
const holderCountCache = new Map<string, CachedData<number>>();
const devHoldingsCache = new Map<string, CachedData<number>>();
const migrationCache = new Map<string, CachedData<boolean>>();

/**
 * Generic cache getter
 */
function getCached<T>(cache: Map<string, CachedData<T>>, key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  const isExpired = Date.now() - cached.cachedAt > cached.ttl;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Generic cache setter
 */
function setCached<T>(
  cache: Map<string, CachedData<T>>,
  key: string,
  data: T,
  ttl: number
): void {
  cache.set(key, {
    data,
    cachedAt: Date.now(),
    ttl,
  });
}

// Market Data Cache
export function getCachedMarketData<T>(mintAddress: string): T | null {
  return getCached(marketDataCache, mintAddress) as T | null;
}

export function setCachedMarketData<T>(mintAddress: string, data: T): void {
  setCached(marketDataCache, mintAddress, data, CACHE_TTL.marketData);
}

// Holder Count Cache
export function getCachedHolderCount(mintAddress: string): number | null {
  return getCached(holderCountCache, mintAddress);
}

export function setCachedHolderCount(mintAddress: string, count: number): void {
  setCached(holderCountCache, mintAddress, count, CACHE_TTL.holderCount);
}

// Dev Holdings Cache (keyed by wallet:mint)
export function getCachedDevHolding(walletAddress: string, mintAddress: string): number | null {
  return getCached(devHoldingsCache, `${walletAddress}:${mintAddress}`);
}

export function setCachedDevHolding(walletAddress: string, mintAddress: string, percent: number): void {
  setCached(devHoldingsCache, `${walletAddress}:${mintAddress}`, percent, CACHE_TTL.devHoldings);
}

// Migration Status Cache
export function getCachedMigrationStatus(mintAddress: string): boolean | null {
  return getCached(migrationCache, mintAddress);
}

export function setCachedMigrationStatus(mintAddress: string, migrated: boolean): void {
  setCached(migrationCache, mintAddress, migrated, CACHE_TTL.migrationStatus);
}

/**
 * Clear all in-memory caches
 */
export function clearAllCaches(): void {
  marketDataCache.clear();
  holderCountCache.clear();
  devHoldingsCache.clear();
  migrationCache.clear();
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats(): {
  marketData: number;
  holderCount: number;
  devHoldings: number;
  migration: number;
} {
  return {
    marketData: marketDataCache.size,
    holderCount: holderCountCache.size,
    devHoldings: devHoldingsCache.size,
    migration: migrationCache.size,
  };
}

// ============================================================
// IN-MEMORY CACHE CLEANUP (prevents memory leaks)
// ============================================================

const CLEANUP_INTERVAL_MS = 60000; // 1 minute

function cleanupExpiredEntries<T>(cache: Map<string, CachedData<T>>): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, value] of cache) {
    if (now - value.cachedAt > value.ttl) {
      cache.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

function startCacheCleanup(): void {
  setInterval(() => {
    cleanupExpiredEntries(marketDataCache);
    cleanupExpiredEntries(holderCountCache);
    cleanupExpiredEntries(devHoldingsCache);
    cleanupExpiredEntries(migrationCache);
  }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load (only in Node.js environment)
if (typeof setInterval !== 'undefined') {
  startCacheCleanup();
}

// ============================================================
// DATABASE CACHE (for cold data - scan results)
// ============================================================

export interface CachedWalletScan {
  walletAddress: string;
  totalScore: number;
  tier: string;
  tokenCount: number;
  migrationCount: number;
  rugCount: number;
  tokensData: unknown;
  cachedAt: Date;
  /** Total tokens found before limit applied */
  totalTokensFound?: number;
  /** Whether scan was limited */
  tokensLimited?: boolean;
}

/**
 * Get cached wallet scan result (1h TTL)
 */
export async function getCachedWalletScan(
  walletAddress: string
): Promise<CachedWalletScan | null> {
  try {
        const result = await pool.query(
      `SELECT * FROM dk_wallet_scan_cache
       WHERE wallet_address = $1
       AND cached_at > NOW() - INTERVAL '1 hour'`,
      [walletAddress]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      walletAddress: row.wallet_address,
      totalScore: row.total_score,
      tier: row.tier,
      tokenCount: row.token_count,
      migrationCount: row.migration_count,
      rugCount: row.rug_count,
      tokensData: row.tokens_data,
      cachedAt: row.cached_at,
    };
  } catch (error) {
    console.error('Error getting cached wallet scan:', error);
    return null;
  }
}

/**
 * Set cached wallet scan result
 */
export async function setCachedWalletScan(
  walletAddress: string,
  scan: Omit<CachedWalletScan, 'walletAddress' | 'cachedAt'>
): Promise<void> {
  try {
        await pool.query(
      `INSERT INTO dk_wallet_scan_cache
       (wallet_address, total_score, tier, token_count, migration_count, rug_count, tokens_data, cached_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (wallet_address)
       DO UPDATE SET
         total_score = $2,
         tier = $3,
         token_count = $4,
         migration_count = $5,
         rug_count = $6,
         tokens_data = $7,
         cached_at = NOW()`,
      [
        walletAddress,
        scan.totalScore,
        scan.tier,
        scan.tokenCount,
        scan.migrationCount,
        scan.rugCount,
        JSON.stringify(scan.tokensData),
      ]
    );
  } catch (error) {
    console.error('Error setting cached wallet scan:', error);
  }
}

/**
 * Invalidate wallet cache (call when wallet is rescanned)
 */
export async function invalidateWalletCache(walletAddress: string): Promise<void> {
  try {
        await Promise.all([
      pool.query('DELETE FROM dk_wallet_tokens_cache WHERE wallet_address = $1', [walletAddress]),
      pool.query('DELETE FROM dk_wallet_scan_cache WHERE wallet_address = $1', [walletAddress]),
    ]);
  } catch (error) {
    console.error('Error invalidating wallet cache:', error);
  }
}
