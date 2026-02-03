/**
 * Wallet Processor
 *
 * Processes queued wallets: scans them, stores results, and triggers alerts.
 */

import { QueuedWallet } from './types';
import { scanWalletQuick, WalletScanResult } from '@/lib/wallet-scan';
import { getOrCreateSystemUser, upsertToken, updateUser, getTokensByCreatorWallet } from '@/lib/db';
import { checkAndPostAlerts } from './alerts';

interface ProcessStats {
  processed: number;
  errors: number;
  alertsPosted: number;
}

const stats: ProcessStats = {
  processed: 0,
  errors: 0,
  alertsPosted: 0,
};

/**
 * Process a single wallet from the queue
 */
export async function processWallet(wallet: QueuedWallet): Promise<WalletScanResult | null> {
  const startTime = Date.now();

  console.log(
    `[Processor] Scanning ${wallet.address.slice(0, 8)}... ` +
    `(token: ${wallet.tokenSymbol || wallet.tokenMint.slice(0, 8)})`
  );

  try {
    // Run the scan
    const result = await scanWalletQuick(wallet.address);

    // Store in database
    await persistScanResult(wallet, result);

    // Check for alerts
    const alertType = await checkAndPostAlerts(
      result,
      wallet.tokenName,
      wallet.tokenSymbol
    );

    if (alertType) {
      stats.alertsPosted++;
    }

    stats.processed++;

    const duration = Date.now() - startTime;
    console.log(
      `[Processor] Completed ${wallet.address.slice(0, 8)}... ` +
      `Score: ${result.totalScore} (${result.tierName}) ` +
      `[${duration}ms]`
    );

    return result;
  } catch (error) {
    stats.errors++;
    console.error(`[Processor] Error scanning ${wallet.address}:`, error);
    return null;
  }
}

/**
 * Persist scan results to the database
 */
async function persistScanResult(
  wallet: QueuedWallet,
  result: WalletScanResult
): Promise<void> {
  // Get or create user for this wallet
  const user = await getOrCreateSystemUser(wallet.address);

  // Update user's score
  await updateUser(user.id, {
    total_score: result.totalScore,
    tier: result.tier,
  });

  // Get existing tokens to avoid duplicates
  const existingTokens = await getTokensByCreatorWallet(wallet.address);
  const existingMints = new Set(existingTokens.map(t => t.mint_address));

  // Upsert each token
  for (const token of result.tokensCreated) {
    // Skip if we already have this token and it has a score
    const existing = existingTokens.find(t => t.mint_address === token.mintAddress);
    if (existing && existing.score > 0 && !token.isRugged) {
      continue;
    }

    await upsertToken({
      mint_address: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      creator_wallet: wallet.address,
      user_id: user.id,
      launch_date: new Date(token.launchedAt * 1000).toISOString(),
      migrated: token.migrated,
      migrated_at: token.migrated ? new Date().toISOString() : null,
      current_market_cap: token.marketCap,
      ath_market_cap: token.marketCap, // Use current as ATH for now
      holder_count: token.currentHolders,
      status: token.isRugged ? 'rug' : 'active',
      score: token.score.total,
      dev_sell_percent: token.devHoldingPercent,
    });
  }
}

/**
 * Get processor stats
 */
export function getProcessorStats(): ProcessStats {
  return { ...stats };
}
