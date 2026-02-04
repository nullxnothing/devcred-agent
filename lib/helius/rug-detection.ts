import { rateLimitedFetch } from './rate-limiter';
import { HELIUS_API_URL } from './client';
import type { HeliusTransaction, RugDetectionResult, WalletTransaction } from './types';

export async function getWalletTransactions(
  walletAddress: string,
  options: {
    limit?: number;
    before?: string;
    type?: string;
  } = {}
): Promise<WalletTransaction[]> {
  const { limit = 100, before, type } = options;

  let url = `${HELIUS_API_URL}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=${limit}`;

  if (before) {
    url += `&before=${before}`;
  }
  if (type) {
    url += `&type=${type}`;
  }

  const response = await rateLimitedFetch(url, { method: 'GET' });

  if (!response.ok) {
    if (response.status === 400) {
      return [];
    }
    throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  }

  const transactions: HeliusTransaction[] = await response.json();

  return transactions.map(tx => ({
    signature: tx.signature,
    timestamp: tx.timestamp,
    type: tx.type,
    description: tx.description,
    fee: tx.fee,
    tokenTransfers: (tx.tokenTransfers || []).map(transfer => ({
      from: transfer.fromUserAccount,
      to: transfer.toUserAccount,
      mint: transfer.mint,
      amount: transfer.tokenAmount,
    })),
  }));
}

export async function getTokenTransfersForWallet(
  walletAddress: string,
  mintAddress: string,
  options: { limit?: number } = {}
): Promise<WalletTransaction[]> {
  const { limit = 500 } = options;

  const transactions = await getWalletTransactions(walletAddress, {
    limit,
    type: 'TRANSFER',
  });

  return transactions.filter(tx =>
    tx.tokenTransfers.some(transfer => transfer.mint === mintAddress)
  );
}

export async function detectRugPattern(
  devWallet: string,
  mintAddress: string,
  launchTimestamp?: number
): Promise<RugDetectionResult> {
  try {
    // Increased from 200 to 500 for more accurate rug detection on high-volume tokens
    const transfers = await getTokenTransfersForWallet(devWallet, mintAddress, { limit: 500 });

    if (transfers.length === 0) {
      return {
        isRug: false,
        severity: null,
        sellPercent: 0,
        totalReceived: 0,
        totalSold: 0,
      };
    }

    let totalReceived = 0;
    let totalSold = 0;
    let firstSellTimestamp: number | undefined;
    let lastSellTimestamp: number | undefined;

    const sortedTransfers = [...transfers].sort((a, b) => a.timestamp - b.timestamp);

    for (const tx of sortedTransfers) {
      for (const transfer of tx.tokenTransfers) {
        if (transfer.mint !== mintAddress) continue;

        if (transfer.to?.toLowerCase() === devWallet.toLowerCase()) {
          totalReceived += transfer.amount;
        } else if (transfer.from?.toLowerCase() === devWallet.toLowerCase()) {
          totalSold += transfer.amount;
          if (!firstSellTimestamp) firstSellTimestamp = tx.timestamp;
          lastSellTimestamp = tx.timestamp;
        }
      }
    }

    if (totalReceived === 0) {
      return {
        isRug: false,
        severity: null,
        sellPercent: 0,
        totalReceived: 0,
        totalSold: 0,
      };
    }

    const sellPercent = (totalSold / totalReceived) * 100;

    let isRug = false;
    let severity: 'soft' | 'hard' | null = null;

    if (sellPercent >= 90) {
      const launchTime = launchTimestamp || sortedTransfers[0]?.timestamp || 0;
      const timeSinceLaunch = firstSellTimestamp ? firstSellTimestamp - launchTime : 0;
      const sellDuration = lastSellTimestamp && firstSellTimestamp ?
        lastSellTimestamp - firstSellTimestamp : 0;

      const HOURS_24 = 24 * 60 * 60;
      if (timeSinceLaunch < HOURS_24 && sellDuration < HOURS_24) {
        isRug = true;
        severity = 'hard';
      } else if (sellPercent >= 95) {
        isRug = true;
        severity = 'hard';
      } else {
        isRug = true;
        severity = 'soft';
      }
    } else if (sellPercent >= 80) {
      isRug = true;
      severity = 'soft';
    }

    return {
      isRug,
      severity,
      sellPercent,
      sellTimestampFirst: firstSellTimestamp,
      sellTimestampLast: lastSellTimestamp,
      totalReceived,
      totalSold,
    };
  } catch {
    return {
      isRug: false,
      severity: null,
      sellPercent: 0,
      totalReceived: 0,
      totalSold: 0,
    };
  }
}
