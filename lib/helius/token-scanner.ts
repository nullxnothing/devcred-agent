import { heliusRpc, HELIUS_API_URL } from './client';
import { rateLimitedFetch } from './rate-limiter';
import type {
  HeliusAsset,
  HeliusTransaction,
  TokenCreated,
  CreatorVerification,
} from './types';
import { SYSTEM_TOKEN_MINTS } from '../constants';

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

interface WalletAssets {
  sol: number;
  tokens: HeliusAsset[];
  nfts: HeliusAsset[];
}

/**
 * Fetch all assets for a wallet in one call using getAssetsByOwner
 * Returns SOL balance, SPL tokens, and NFTs in a single API call
 */
export async function getWalletAssets(walletAddress: string): Promise<WalletAssets> {
  try {
    const result = await heliusRpc<{
      items: HeliusAsset[];
      nativeBalance?: { lamports: number };
    }>('getAssetsByOwner', {
      ownerAddress: walletAddress,
      displayOptions: {
        showFungible: true,
        showNativeBalance: true,
      },
      limit: 1000,
    });

    const items = result.items || [];

    return {
      sol: (result.nativeBalance?.lamports ?? 0) / 1e9,
      tokens: items.filter(a => a.interface === 'FungibleToken' || a.interface === 'FungibleAsset'),
      nfts: items.filter(a => a.interface === 'V1_NFT' || a.interface === 'ProgrammableNFT'),
    };
  } catch (error) {
    console.error('Error fetching wallet assets:', error);
    return { sol: 0, tokens: [], nfts: [] };
  }
}

export async function getTokensCreatedByWallet(walletAddress: string): Promise<TokenCreated[]> {
  const PAGE_LIMIT = 1000;
  const allTokens: TokenCreated[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const result = await heliusRpc<{ items: HeliusAsset[]; total: number }>('getAssetsByCreator', {
      creatorAddress: walletAddress,
      onlyVerified: false,
      page,
      limit: PAGE_LIMIT,
    });

    const tokens = result.items
      .filter(asset => asset.token_info)
      .map(asset => ({
        mintAddress: asset.id,
        name: asset.content?.metadata?.name || 'Unknown',
        symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        creatorAddress: walletAddress,
        supply: asset.token_info?.supply || 0,
        decimals: asset.token_info?.decimals || 0,
        pricePerToken: asset.token_info?.price_info?.price_per_token,
      }));

    allTokens.push(...tokens);

    if (result.items.length < PAGE_LIMIT) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allTokens;
}

export async function getAssetByMint(mintAddress: string): Promise<HeliusAsset | null> {
  try {
    const result = await heliusRpc<HeliusAsset>('getAsset', {
      id: mintAddress,
    });
    return result;
  } catch {
    return null;
  }
}

export async function getAssetBatch(
  mintAddresses: string[]
): Promise<Map<string, HeliusAsset | null>> {
  const results = new Map<string, HeliusAsset | null>();

  if (mintAddresses.length === 0) {
    return results;
  }

  const BATCH_SIZE = 1000;

  for (let i = 0; i < mintAddresses.length; i += BATCH_SIZE) {
    const batch = mintAddresses.slice(i, i + BATCH_SIZE);

    try {
      const response = await heliusRpc<HeliusAsset[]>('getAssetBatch', {
        ids: batch,
      });

      const assets = Array.isArray(response) ? response : [];
      for (const asset of assets) {
        if (asset?.id) {
          results.set(asset.id, asset);
        }
      }

      for (const mint of batch) {
        if (!results.has(mint)) {
          results.set(mint, null);
        }
      }
    } catch (error) {
      console.error('Error in getAssetBatch:', error);
      for (const mint of batch) {
        results.set(mint, null);
      }
    }
  }

  return results;
}

export async function verifyTokenCreator(
  walletAddress: string,
  mintAddress: string
): Promise<CreatorVerification> {
  try {
    const url = `${HELIUS_API_URL}/addresses/${mintAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
    const response = await rateLimitedFetch(url, { method: 'GET' });

    if (!response.ok) {
      console.error('Failed to fetch mint transactions:', response.status);
      return { isCreator: false };
    }

    const transactions: HeliusTransaction[] = await response.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return { isCreator: false };
    }

    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    for (const tx of sortedTxs.slice(0, 5)) {
      const isPumpFunTx = JSON.stringify(tx).includes(PUMP_FUN_PROGRAM) ||
        tx.type === 'CREATE' ||
        tx.description?.toLowerCase().includes('create');

      if (isPumpFunTx || sortedTxs.indexOf(tx) === 0) {
        if (tx.feePayer?.toLowerCase() === walletAddress.toLowerCase()) {
          return {
            isCreator: true,
            creationSignature: tx.signature,
            creationTimestamp: tx.timestamp,
            feePayer: tx.feePayer,
          };
        }
      }
    }

    for (const tx of sortedTxs) {
      if (tx.feePayer?.toLowerCase() === walletAddress.toLowerCase()) {
        const walletReceivedTokens = tx.tokenTransfers?.some(
          transfer => transfer.toUserAccount?.toLowerCase() === walletAddress.toLowerCase()
        );

        if (walletReceivedTokens && sortedTxs.indexOf(tx) < 3) {
          return {
            isCreator: true,
            creationSignature: tx.signature,
            creationTimestamp: tx.timestamp,
            feePayer: tx.feePayer,
          };
        }
      }
    }

    return { isCreator: false };
  } catch (error) {
    console.error('Error verifying token creator:', error);
    return { isCreator: false };
  }
}

export async function getTokensCreatedByWalletViaFeePayer(walletAddress: string): Promise<TokenCreated[]> {
  const seenMints = new Set<string>();
  const mintInfos: Array<{
    mint: string;
    signature: string;
    timestamp: number;
  }> = [];

  try {
    let before: string | undefined;
    let hasMore = true;
    const MAX_PAGES = 100; // Scan up to 10,000 transactions to catch all token creations
    let page = 0;

    while (hasMore && page < MAX_PAGES) {
      let url = `${HELIUS_API_URL}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
      if (before) {
        url += `&before=${before}`;
      }

      const response = await rateLimitedFetch(url, { method: 'GET' });
      if (!response.ok) break;

      const transactions: HeliusTransaction[] = await response.json();
      if (!Array.isArray(transactions) || transactions.length === 0) {
        hasMore = false;
        break;
      }

      before = transactions[transactions.length - 1].signature;
      page++;

      for (const tx of transactions) {
        if (tx.feePayer?.toLowerCase() !== walletAddress.toLowerCase()) {
          continue;
        }

        const isCreateTx = tx.type === 'CREATE';
        if (!isCreateTx) continue;

        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          for (const transfer of tx.tokenTransfers) {
            const walletReceivedTokens = transfer.toUserAccount?.toLowerCase() === walletAddress.toLowerCase();

            if (walletReceivedTokens && !seenMints.has(transfer.mint) && transfer.tokenAmount > 0 && !SYSTEM_TOKEN_MINTS.has(transfer.mint)) {
              seenMints.add(transfer.mint);
              mintInfos.push({
                mint: transfer.mint,
                signature: tx.signature,
                timestamp: tx.timestamp,
              });
            }
          }
        }
      }

      if (transactions.length < 100) {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error('Error fetching tokens via feePayer:', error);
    return [];
  }

  if (mintInfos.length === 0) {
    return [];
  }

  const mints = mintInfos.map(m => m.mint);
  const assetsMap = await getAssetBatch(mints);

  const tokens: TokenCreated[] = [];
  for (const info of mintInfos) {
    const asset = assetsMap.get(info.mint);
    if (asset) {
      tokens.push({
        mintAddress: info.mint,
        name: asset.content?.metadata?.name || 'Unknown',
        symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        creatorAddress: walletAddress,
        supply: asset.token_info?.supply || 0,
        decimals: asset.token_info?.decimals || 0,
        pricePerToken: asset.token_info?.price_info?.price_per_token,
        creationSignature: info.signature,
        creationTimestamp: info.timestamp,
        creationVerified: true,
      });
    }
  }

  return tokens;
}

