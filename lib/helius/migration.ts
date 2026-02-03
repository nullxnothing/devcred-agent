import { rateLimitedFetch } from './rate-limiter';
import { HELIUS_API_URL } from './client';
import type { HeliusTransaction, MigratedTokenInfo } from './types';
import { DEX_CONFIG } from '../constants';

const MIGRATION_DEX_SOURCES = DEX_CONFIG.MIGRATION_DEX_SOURCES;
const NON_MIGRATION_SOURCES = DEX_CONFIG.NON_MIGRATION_SOURCES;

export async function getMigratedTokensFromSwapHistory(
  walletAddress: string,
  tokenMints: Set<string>
): Promise<Map<string, MigratedTokenInfo>> {
  return getMigratedTokensFromSwapHistoryLegacy(walletAddress, tokenMints);
}

async function getMigratedTokensFromSwapHistoryLegacy(
  walletAddress: string,
  tokenMints: Set<string>
): Promise<Map<string, MigratedTokenInfo>> {
  const migratedTokens = new Map<string, MigratedTokenInfo>();

  let before: string | undefined;
  let hasMore = true;
  let totalTxFetched = 0;
  const MAX_TX_TO_SCAN = 1000;

  while (hasMore && totalTxFetched < MAX_TX_TO_SCAN) {
    let url = `${HELIUS_API_URL}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100&type=SWAP`;
    if (before) {
      url += `&before=${before}`;
    }

    try {
      const response = await rateLimitedFetch(url, { method: 'GET' });
      if (!response.ok) break;

      const transactions: HeliusTransaction[] = await response.json();
      if (transactions.length === 0) {
        hasMore = false;
        break;
      }

      totalTxFetched += transactions.length;
      before = transactions[transactions.length - 1].signature;

      for (const tx of transactions) {
        const source = (tx.source || '').toUpperCase();
        const isMigrationDex = MIGRATION_DEX_SOURCES.has(source);
        const isNonMigration = NON_MIGRATION_SOURCES.has(source);

        if (isNonMigration) continue;
        if (!isMigrationDex) continue;

        if (tx.tokenTransfers) {
          for (const transfer of tx.tokenTransfers) {
            if (tokenMints.has(transfer.mint)) {
              const existingInfo = migratedTokens.get(transfer.mint);

              if (existingInfo) {
                existingInfo.swapCount++;
                existingInfo.firstSwapTimestamp = Math.min(
                  existingInfo.firstSwapTimestamp,
                  tx.timestamp
                );
              } else {
                migratedTokens.set(transfer.mint, {
                  mintAddress: transfer.mint,
                  dexSource: source,
                  firstSwapTimestamp: tx.timestamp,
                  swapCount: 1,
                });
              }
            }
          }
        }
      }

      if (transactions.length < 100) {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error in legacy swap history fetch:', error);
      break;
    }
  }

  return migratedTokens;
}

export async function getTransactionsBySource(
  walletAddress: string,
  source: string,
  limit: number = 100
): Promise<HeliusTransaction[]> {
  const url = `${HELIUS_API_URL}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=${limit}&source=${source}`;

  try {
    const response = await rateLimitedFetch(url, { method: 'GET' });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
