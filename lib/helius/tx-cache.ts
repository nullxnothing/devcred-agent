/**
 * Transaction history cache with LRU eviction
 * Prevents duplicate API calls when both token discovery and migration detection
 * need to scan the same wallet's transactions
 */

import { rateLimitedFetch } from './rate-limiter';
import { HELIUS_API_URL } from './client';
import type { HeliusTransaction } from './types';

interface CacheEntry {
  transactions: HeliusTransaction[];
  timestamp: number;
}

const txCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 300000; // 5 minutes
const MAX_CACHE_SIZE = 500;

/**
 * Evict oldest entry when cache is full
 */
function evictOldest(): void {
  if (txCache.size === 0) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  const entries = Array.from(txCache.entries());
  for (const [key, entry] of entries) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    txCache.delete(oldestKey);
  }
}

/**
 * Clean expired entries
 */
function cleanExpired(): void {
  const now = Date.now();
  const entries = Array.from(txCache.entries());
  for (const [key, entry] of entries) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      txCache.delete(key);
    }
  }
}

/**
 * Fetch transactions for a wallet, using cache if available
 * @param wallet - Wallet address
 * @param maxPages - Maximum number of pages to fetch (100 txs per page)
 */
export async function getCachedWalletTransactions(
  wallet: string,
  maxPages: number = 10
): Promise<HeliusTransaction[]> {
  // Check cache first
  const cached = txCache.get(wallet);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.transactions;
  }

  // Fetch fresh data
  const transactions: HeliusTransaction[] = [];
  let before: string | undefined;
  let page = 0;

  while (page < maxPages) {
    let url = `${HELIUS_API_URL}/addresses/${wallet}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
    if (before) {
      url += `&before=${before}`;
    }

    try {
      const response = await rateLimitedFetch(url, { method: 'GET' });
      if (!response.ok) break;

      const pageTxs: HeliusTransaction[] = await response.json();
      if (!Array.isArray(pageTxs) || pageTxs.length === 0) {
        break;
      }

      transactions.push(...pageTxs);
      before = pageTxs[pageTxs.length - 1].signature;
      page++;

      if (pageTxs.length < 100) {
        break;
      }
    } catch {
      break;
    }
  }

  // Store in cache with LRU eviction
  if (txCache.size >= MAX_CACHE_SIZE) {
    cleanExpired();
    if (txCache.size >= MAX_CACHE_SIZE) {
      evictOldest();
    }
  }

  txCache.set(wallet, {
    transactions,
    timestamp: Date.now(),
  });

  return transactions;
}

/**
 * Invalidate cache for a specific wallet
 */
export function invalidateWalletCache(wallet: string): void {
  txCache.delete(wallet);
}

/**
 * Clear entire cache
 */
export function clearTxCache(): void {
  txCache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getTxCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return {
    size: txCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
