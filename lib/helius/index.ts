export { heliusRpc, heliusRpcArray, HELIUS_API_URL, sleep } from './client';
export { rateLimitedFetch, rateLimitedFetchWithRetry } from './rate-limiter';

export type {
  HeliusAsset,
  HeliusTokenAccount,
  HeliusTransaction,
  TokenCreated,
  CreatorVerification,
  TokenHolder,
  WalletTransaction,
  TransactionsForAddressResult,
  TransactionForAddress,
  MigratedTokenInfo,
  RugDetectionResult,
} from './types';

export {
  getTokensCreatedByWallet,
  getAssetByMint,
  getAssetBatch,
  verifyTokenCreator,
  getTokensCreatedByWalletViaFeePayer,
  getTokensFromTransactionHistory,
  getAllTokensCreatedByWallet,
  getTokensCreatedByWalletFast,
  getTokensCreatedByWalletVerified,
  hasTokenCreationHistory,
} from './token-scanner';

export {
  getTokenHolders,
  getHolderCount,
  batchGetHolderCounts,
  getHolderCountQuick,
  getHolderCountForScoring,
  batchGetHolderCountsQuick,
  getDevHoldingPercent,
  batchGetDevHoldings,
} from './holder-analysis';

export {
  getWalletTransactions,
  getTokenTransfersForWallet,
  detectRugPattern,
} from './rug-detection';

export {
  getMigratedTokensFromSwapHistory,
  getTransactionsBySource,
} from './migration';

import type { TokenCreated, MigratedTokenInfo } from './types';

export async function getTokensWithMigrationStatus(walletAddress: string): Promise<{
  tokens: TokenCreated[];
  migrated: Map<string, MigratedTokenInfo>;
  totalTokens: number;
  migratedCount: number;
}> {
  const { getAllTokensCreatedByWallet } = await import('./token-scanner');
  const { getMigratedTokensFromSwapHistory } = await import('./migration');

  const tokens = await getAllTokensCreatedByWallet(walletAddress);
  const tokenMints = new Set(tokens.map(t => t.mintAddress));

  const migrated = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);

  return {
    tokens,
    migrated,
    totalTokens: tokens.length,
    migratedCount: migrated.size,
  };
}

export async function getTokensCreatedByWalletVerifiedWithMigration(walletAddress: string): Promise<{
  tokens: TokenCreated[];
  migrated: Map<string, MigratedTokenInfo>;
  totalTokens: number;
  migratedCount: number;
}> {
  const { getTokensCreatedByWalletVerified } = await import('./token-scanner');
  const { getMigratedTokensFromSwapHistory } = await import('./migration');

  const tokens = await getTokensCreatedByWalletVerified(walletAddress);
  const tokenMints = new Set(tokens.map(t => t.mintAddress));

  const migrated = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);

  return {
    tokens,
    migrated,
    totalTokens: tokens.length,
    migratedCount: migrated.size,
  };
}
