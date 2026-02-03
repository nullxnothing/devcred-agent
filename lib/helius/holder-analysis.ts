import { heliusRpc, sleep } from './client';
import type { HeliusTokenAccount, TokenHolder } from './types';
import { getAssetByMint } from './token-scanner';

export async function getTokenHolders(tokenAddress: string): Promise<{
  totalHolders: number;
  holders: TokenHolder[];
  topHolders: TokenHolder[];
}> {
  const PAGE_LIMIT = 1000;
  const allHolders: TokenHolder[] = [];
  let cursor: string | null = null;

  do {
    const params: Record<string, unknown> = {
      mint: tokenAddress,
      limit: PAGE_LIMIT,
      options: { showZeroBalance: false },
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const result = await heliusRpc<{
      total: number;
      token_accounts: HeliusTokenAccount[];
      cursor?: string;
    }>('getTokenAccounts', params);

    const holders = result.token_accounts.map(account => ({
      ownerAddress: account.owner,
      tokenAccount: account.address,
      amount: account.amount,
    }));

    allHolders.push(...holders);
    cursor = result.cursor || null;
  } while (cursor);

  const holdersByOwner = new Map<string, TokenHolder>();
  for (const holder of allHolders) {
    const existing = holdersByOwner.get(holder.ownerAddress);
    if (existing) {
      existing.amount += holder.amount;
    } else {
      holdersByOwner.set(holder.ownerAddress, { ...holder });
    }
  }

  const uniqueHolders = Array.from(holdersByOwner.values());
  const sortedHolders = [...uniqueHolders].sort((a, b) => b.amount - a.amount);

  return {
    totalHolders: uniqueHolders.length,
    holders: uniqueHolders,
    topHolders: sortedHolders.slice(0, 100),
  };
}

export async function getHolderCount(mintAddress: string): Promise<number> {
  const uniqueOwners = new Set<string>();
  let cursor: string | null = null;

  try {
    do {
      const params: Record<string, unknown> = {
        mint: mintAddress,
        limit: 1000,
        options: { showZeroBalance: false },
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const result = await heliusRpc<{
        token_accounts: HeliusTokenAccount[];
        cursor?: string;
      }>('getTokenAccounts', params);

      for (const account of result.token_accounts || []) {
        if (account.amount > 0) {
          uniqueOwners.add(account.owner);
        }
      }

      cursor = result.cursor || null;
    } while (cursor);
  } catch (error) {
    console.error(`Error getting holder count for ${mintAddress}:`, error);
    return 0;
  }

  return uniqueOwners.size;
}

export async function batchGetHolderCounts(
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  const CONCURRENCY = 5;

  for (let i = 0; i < mintAddresses.length; i += CONCURRENCY) {
    const batch = mintAddresses.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(mint => getHolderCount(mint))
    );

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j], batchResults[j]);
    }

    if (i + CONCURRENCY < mintAddresses.length) {
      await sleep(100);
    }
  }

  return results;
}

export async function getHolderCountQuick(mintAddress: string): Promise<number> {
  try {
    const result = await heliusRpc<{
      token_accounts: HeliusTokenAccount[];
      cursor?: string;
    }>('getTokenAccounts', {
      mint: mintAddress,
      limit: 1000,
      options: { showZeroBalance: false },
    });

    const uniqueOwners = new Set<string>();
    for (const account of result.token_accounts || []) {
      if (account.amount > 0) {
        uniqueOwners.add(account.owner);
      }
    }

    return uniqueOwners.size;
  } catch {
    return 0;
  }
}

export async function getHolderCountForScoring(mintAddress: string): Promise<number> {
  try {
    const uniqueOwners = new Set<string>();
    let cursor: string | null = null;
    let pageCount = 0;

    do {
      const params: Record<string, unknown> = {
        mint: mintAddress,
        limit: 1000,
        options: { showZeroBalance: false },
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const result = await heliusRpc<{
        token_accounts: HeliusTokenAccount[];
        cursor?: string;
      }>('getTokenAccounts', params);

      for (const account of result.token_accounts || []) {
        if (account.amount > 0) {
          uniqueOwners.add(account.owner);
        }
      }

      cursor = result.cursor || null;
      pageCount++;

      if (uniqueOwners.size >= 5000) {
        return uniqueOwners.size;
      }

      if (!cursor) {
        break;
      }
    } while (cursor && pageCount < 10);

    return uniqueOwners.size;
  } catch {
    return 0;
  }
}

export async function batchGetHolderCountsQuick(
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  const CONCURRENCY = 25;

  const batches: string[][] = [];
  for (let i = 0; i < mintAddresses.length; i += CONCURRENCY) {
    batches.push(mintAddresses.slice(i, i + CONCURRENCY));
  }

  const batchPromises = batches.map(async (batch) => {
    const batchResults = await Promise.all(
      batch.map(mint => getHolderCountQuick(mint))
    );
    return batch.map((mint, j) => ({ mint, count: batchResults[j] }));
  });

  const allResults = await Promise.all(batchPromises);

  for (const batchResult of allResults) {
    for (const { mint, count } of batchResult) {
      results.set(mint, count);
    }
  }

  return results;
}

export async function getDevHoldingPercent(
  devWallet: string,
  mintAddress: string
): Promise<number> {
  try {
    const result = await heliusRpc<{
      token_accounts: HeliusTokenAccount[];
    }>('getTokenAccounts', {
      mint: mintAddress,
      owner: devWallet,
      limit: 10,
    });

    if (!result.token_accounts || result.token_accounts.length === 0) {
      return 0;
    }

    const devBalance = result.token_accounts.reduce(
      (sum, account) => sum + account.amount,
      0
    );

    if (devBalance === 0) {
      return 0;
    }

    const asset = await getAssetByMint(mintAddress);
    if (!asset?.token_info?.supply) {
      return 0;
    }

    const totalSupply = asset.token_info.supply;
    if (totalSupply === 0) {
      return 0;
    }

    return (devBalance / totalSupply) * 100;
  } catch {
    return 0;
  }
}

export async function batchGetDevHoldings(
  devWallet: string,
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  const CONCURRENCY = 25;

  const batches: string[][] = [];
  for (let i = 0; i < mintAddresses.length; i += CONCURRENCY) {
    batches.push(mintAddresses.slice(i, i + CONCURRENCY));
  }

  const batchPromises = batches.map(async (batch) => {
    const batchResults = await Promise.all(
      batch.map(mint => getDevHoldingPercent(devWallet, mint))
    );
    return batch.map((mint, j) => ({ mint, holding: batchResults[j] }));
  });

  const allResults = await Promise.all(batchPromises);

  for (const batchResult of allResults) {
    for (const { mint, holding } of batchResult) {
      results.set(mint, holding);
    }
  }

  return results;
}
