/**
 * Helius API Client for Solana blockchain data
 * Uses DAS API for token/asset queries (superior to legacy RPC)
 */

// Helius endpoint constants (getter functions to support late env loading)
function getHeliusRpcUrl(): string {
  return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
}
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

// Rate limiting: track request timestamps
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_SECOND = 50; // Dev plan allows higher throughput

interface HeliusAsset {
  id: string;
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    json_uri?: string;
  };
  token_info?: {
    supply: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
      total_price: number;
    };
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
  ownership?: {
    owner: string;
  };
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

interface HeliusTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  frozen: boolean;
}

interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  fee: number;
  feePayer: string;
  source?: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard: string;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

export interface TokenCreated {
  mintAddress: string;
  name: string;
  symbol: string;
  creatorAddress: string;
  supply: number;
  decimals: number;
  pricePerToken?: number;
  creationSignature?: string;
  creationTimestamp?: number;
  creationVerified?: boolean;
}

export interface CreatorVerification {
  isCreator: boolean;
  creationSignature?: string;
  creationTimestamp?: number;
  feePayer?: string;
}

// Pump.fun program ID
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Token Program ID (SPL Token)
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

// System tokens to exclude from detection (not user-created)
const SYSTEM_TOKEN_MINTS = new Set([
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

export interface TokenHolder {
  ownerAddress: string;
  tokenAccount: string;
  amount: number;
}

export interface WalletTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  fee: number;
  tokenTransfers: Array<{
    from: string;
    to: string;
    mint: string;
    amount: number;
  }>;
}

// Response types for getTransactionsForAddress (newer Helius method)
interface TransactionsForAddressResult {
  data: TransactionForAddress[];
  nextCursor?: string;
}

interface TransactionForAddress {
  signature: string;
  timestamp: number;
  slot: number;
  fee: number;
  feePayer: string;
  description?: string;
  type?: string;
  source?: string;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard?: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

/**
 * Rate limiter to respect Helius API limits
 * Blocks if we're exceeding MAX_REQUESTS_PER_SECOND
 */
async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const oneSecondAgo = now - 1000;

  // Remove timestamps older than 1 second
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneSecondAgo) {
    requestTimestamps.shift();
  }

  // If at limit, wait until oldest request expires
  if (requestTimestamps.length >= MAX_REQUESTS_PER_SECOND) {
    const waitTime = requestTimestamps[0] + 1000 - now;
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  requestTimestamps.push(Date.now());
  return fetch(url, options);
}

/**
 * Execute a JSON-RPC call to Helius (object params)
 */
async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await rateLimitedFetch(getHeliusRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'devcred',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Helius RPC error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message}`);
  }

  return data.result as T;
}

/**
 * Execute a JSON-RPC call to Helius (array params for newer methods)
 */
async function heliusRpcArray<T>(method: string, params: unknown[]): Promise<T> {
  const response = await rateLimitedFetch(getHeliusRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'devcred',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Helius RPC error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message}`);
  }

  return data.result as T;
}

/**
 * Get all tokens created/deployed by a wallet address
 * Uses DAS API getAssetsByCreator for accurate creator attribution
 */
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
      .filter(asset => asset.token_info) // Only fungible tokens
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

    // Check if there are more pages
    if (result.items.length < PAGE_LIMIT) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allTokens;
}

/**
 * Get holder distribution for a token
 * Uses getTokenAccounts with pagination to handle tokens with many holders
 */
export async function getTokenHolders(tokenAddress: string): Promise<{
  totalHolders: number;
  holders: TokenHolder[];
  topHolders: TokenHolder[];
}> {
  const PAGE_LIMIT = 1000;
  const allHolders: TokenHolder[] = [];
  let cursor: string | null = null;

  // Paginate through all token accounts
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

  // Deduplicate by owner (one owner can have multiple token accounts)
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

  // Sort by amount descending to get top holders
  const sortedHolders = [...uniqueHolders].sort((a, b) => b.amount - a.amount);

  return {
    totalHolders: uniqueHolders.length,
    holders: uniqueHolders,
    topHolders: sortedHolders.slice(0, 100), // Top 100 holders
  };
}

/**
 * Get transaction history for a wallet
 * Uses Helius Enhanced Transactions API for parsed, human-readable data
 */
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
    // Return empty array for 400 errors (invalid address, no transactions, etc.)
    // This prevents noisy errors for tokens/wallets that don't have transaction history
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

/**
 * Get token transfers for a specific token by a wallet
 * Useful for analyzing dev sell patterns
 */
export async function getTokenTransfersForWallet(
  walletAddress: string,
  mintAddress: string,
  options: { limit?: number } = {}
): Promise<WalletTransaction[]> {
  const { limit = 100 } = options;

  // Get all TRANSFER type transactions
  const transactions = await getWalletTransactions(walletAddress, {
    limit,
    type: 'TRANSFER',
  });

  // Filter for specific token
  return transactions.filter(tx =>
    tx.tokenTransfers.some(transfer => transfer.mint === mintAddress)
  );
}

/**
 * Check if wallet has any token creation transactions
 * Useful for verifying a wallet is actually a dev wallet
 */
export async function hasTokenCreationHistory(walletAddress: string): Promise<boolean> {
  const tokens = await getTokensCreatedByWallet(walletAddress);
  return tokens.length > 0;
}

/**
 * Get asset by ID (mint address) using DAS API
 */
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

/**
 * Batch get assets by mint addresses using DAS API
 * Much faster than sequential getAssetByMint calls - supports up to 1000 at once
 *
 * @param mintAddresses - Array of mint addresses to fetch
 * @returns Map of mint address to asset (null if not found)
 */
export async function getAssetBatch(
  mintAddresses: string[]
): Promise<Map<string, HeliusAsset | null>> {
  const results = new Map<string, HeliusAsset | null>();

  if (mintAddresses.length === 0) {
    return results;
  }

  // Helius getAssetBatch supports up to 1000 at once
  const BATCH_SIZE = 1000;

  for (let i = 0; i < mintAddresses.length; i += BATCH_SIZE) {
    const batch = mintAddresses.slice(i, i + BATCH_SIZE);

    try {
      const response = await heliusRpc<HeliusAsset[]>('getAssetBatch', {
        ids: batch,
      });

      // Map results by ID - response is array directly
      const assets = Array.isArray(response) ? response : [];
      for (const asset of assets) {
        if (asset?.id) {
          results.set(asset.id, asset);
        }
      }

      // Fill in nulls for any mints that weren't returned
      for (const mint of batch) {
        if (!results.has(mint)) {
          results.set(mint, null);
        }
      }
    } catch (error) {
      console.error('Error in getAssetBatch:', error);
      // On error, set all to null
      for (const mint of batch) {
        results.set(mint, null);
      }
    }
  }

  return results;
}

/**
 * Verify if a wallet is the creator of a token by checking the creation transaction's feePayer
 * This is the ONLY reliable way to identify pump.fun token creators since the pump.fun program
 * is listed as the metadata creator, not the dev wallet.
 *
 * @param walletAddress - The wallet address to verify as creator
 * @param mintAddress - The token mint address to check
 * @returns Verification result with creation details
 */
export async function verifyTokenCreator(
  walletAddress: string,
  mintAddress: string
): Promise<CreatorVerification> {
  try {
    // Get transactions for the mint address to find the creation transaction
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

    // Sort by timestamp ascending to find the earliest transaction (creation)
    const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

    // Find the creation transaction - it should involve the pump.fun program
    // and be one of the earliest transactions for this mint
    for (const tx of sortedTxs.slice(0, 5)) { // Check first 5 transactions
      const isPumpFunTx = JSON.stringify(tx).includes(PUMP_FUN_PROGRAM) ||
        tx.type === 'CREATE' ||
        tx.description?.toLowerCase().includes('create');

      if (isPumpFunTx || sortedTxs.indexOf(tx) === 0) {
        // Check if the wallet address is the feePayer
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

    // If we didn't find a creation tx with this wallet as feePayer, check all txs
    // where this wallet was the feePayer (might be a different tx structure)
    for (const tx of sortedTxs) {
      if (tx.feePayer?.toLowerCase() === walletAddress.toLowerCase()) {
        // Additional check: was this an early transaction and did wallet receive tokens?
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

/**
 * Get all tokens created by a wallet using feePayer-based verification
 * Uses Helius Enhanced Transactions REST API with batch metadata fetching
 *
 * @param walletAddress - The wallet to scan for created tokens
 * @returns Array of verified tokens created by this wallet
 */
export async function getTokensCreatedByWalletViaFeePayer(walletAddress: string): Promise<TokenCreated[]> {
  const seenMints = new Set<string>();
  // Collect mint info first, then batch fetch metadata
  const mintInfos: Array<{
    mint: string;
    signature: string;
    timestamp: number;
  }> = [];

  try {
    let before: string | undefined;
    let hasMore = true;
    const MAX_PAGES = 10; // Reduced from 20 - most devs have <500 creates
    let page = 0;

    while (hasMore && page < MAX_PAGES) {
      // Use REST API (Enhanced Transactions endpoint)
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

      // Process transactions - collect mints where wallet is feePayer
      for (const tx of transactions) {
        // Must be the feePayer to be considered the creator
        if (tx.feePayer?.toLowerCase() !== walletAddress.toLowerCase()) {
          continue;
        }

        // ONLY count CREATE type transactions - not swaps, buys, or other pump.fun activity
        const isCreateTx = tx.type === 'CREATE';
        if (!isCreateTx) continue;


        // Look for token transfers where wallet received tokens (dev allocation)
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          for (const transfer of tx.tokenTransfers) {
            const walletReceivedTokens = transfer.toUserAccount?.toLowerCase() === walletAddress.toLowerCase();

            // Check if wallet received tokens in this transaction
            // Skip system tokens (wSOL, USDC, etc.)
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

  // No tokens found
  if (mintInfos.length === 0) {
    return [];
  }

  // BATCH FETCH all metadata in one call (instead of N sequential calls)
  const mints = mintInfos.map(m => m.mint);
  const assetsMap = await getAssetBatch(mints);

  // Build final token list
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

/**
 * Legacy fallback for getTokensCreatedByWalletViaFeePayer
 * Uses the older enhanced transactions API (slower but more stable)
 */
async function getTokensCreatedByWalletViaFeePayerLegacy(walletAddress: string): Promise<TokenCreated[]> {
  const seenMints = new Set<string>();
  const mintInfos: Array<{
    mint: string;
    signature: string;
    timestamp: number;
  }> = [];

  try {
    let before: string | undefined;
    let hasMore = true;
    const MAX_PAGES = 20;
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

        const txJson = JSON.stringify(tx);
        const isPumpFunTx = txJson.includes(PUMP_FUN_PROGRAM);
        const isCreateTx = tx.type === 'CREATE';

        if (!isPumpFunTx && !isCreateTx) continue;

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
    console.error('Error in legacy feePayer fetch:', error);
  }

  // No tokens found
  if (mintInfos.length === 0) {
    return [];
  }

  // BATCH FETCH all metadata
  const mints = mintInfos.map(m => m.mint);
  const assetsMap = await getAssetBatch(mints);

  // Build final token list
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

/**
 * Get tokens created via pump.fun by scanning transaction history
 * DEPRECATED: Use getTokensCreatedByWalletViaFeePayer for accurate creator verification
 * This method catches false positives (early buyers mistaken for creators)
 */
export async function getTokensFromTransactionHistory(walletAddress: string): Promise<TokenCreated[]> {
  const tokens: TokenCreated[] = [];
  const seenMints = new Set<string>();

  try {
    // Paginate through transactions to find all token creations
    // Need to scan more pages since some users have lots of tx history
    let before: string | undefined;
    let hasMore = true;
    const MAX_PAGES = 15; // Scan up to 1500 transactions
    let page = 0;

    while (hasMore && page < MAX_PAGES) {
      let url = `${HELIUS_API_URL}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
      if (before) {
        url += `&before=${before}`;
      }

      const response = await rateLimitedFetch(url, { method: 'GET' });
      if (!response.ok) break;

      const transactions = await response.json();
      if (!Array.isArray(transactions) || transactions.length === 0) {
        hasMore = false;
        break;
      }

      // Track last signature for pagination
      before = transactions[transactions.length - 1].signature;
      page++;

      // Look for transactions involving pump.fun tokens
      for (const tx of transactions) {
        // Check if this transaction involves the pump.fun program
        const isPumpFunTx = tx.instructions?.some((inst: { programId?: string }) => 
          inst.programId === PUMP_FUN_PROGRAM
        ) || JSON.stringify(tx).includes(PUMP_FUN_PROGRAM);

        // Also check CREATE type transactions
        const isCreateTx = tx.type === 'CREATE';
        
        if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
          for (const transfer of tx.tokenTransfers) {
            // Look for pump.fun mints (end with 'pump')
            const isPumpMint = transfer.mint?.endsWith('pump');
            // Check if wallet RECEIVED tokens - this indicates they created or bought early
            const walletReceivedTokens = transfer.toUserAccount === walletAddress;
            
            // If it's a pump mint and wallet received tokens, likely a creator
            if (isPumpMint && walletReceivedTokens && !seenMints.has(transfer.mint) && transfer.tokenAmount > 0) {
              // Get token metadata
              const asset = await getAssetByMint(transfer.mint);
              if (asset) {
                seenMints.add(transfer.mint);
                tokens.push({
                  mintAddress: transfer.mint,
                  name: asset.content?.metadata?.name || 'Unknown',
                  symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
                  creatorAddress: walletAddress,
                  supply: asset.token_info?.supply || 0,
                  decimals: asset.token_info?.decimals || 0,
                  pricePerToken: asset.token_info?.price_info?.price_per_token,
                });
              }
            }
          }
        }
      }

      // If we got less than 100, no more pages
      if (transactions.length < 100) {
        hasMore = false;
      }
    }
  } catch (error) {
    console.error('Error fetching transaction history:', error);
  }

  return tokens;
}

/**
 * Combined token discovery - uses both DAS creator API and transaction history
 * This ensures we catch both standard tokens AND pump.fun launches
 */
export async function getAllTokensCreatedByWallet(walletAddress: string): Promise<TokenCreated[]> {
  const tokenMap = new Map<string, TokenCreated>();

  // Method 1: Standard DAS API creator lookup
  const dasTokens = await getTokensCreatedByWallet(walletAddress);
  for (const token of dasTokens) {
    tokenMap.set(token.mintAddress, token);
  }

  // Method 2: Transaction history scan for pump.fun tokens
  const txTokens = await getTokensFromTransactionHistory(walletAddress);
  for (const token of txTokens) {
    if (!tokenMap.has(token.mintAddress)) {
      tokenMap.set(token.mintAddress, token);
    }
  }

  return Array.from(tokenMap.values());
}

// Use centralized DEX source lists from constants
import { DEX_CONFIG } from './constants';
const MIGRATION_DEX_SOURCES = DEX_CONFIG.MIGRATION_DEX_SOURCES;
const NON_MIGRATION_SOURCES = DEX_CONFIG.NON_MIGRATION_SOURCES;

export interface MigratedTokenInfo {
  mintAddress: string;
  dexSource: string;
  firstSwapTimestamp: number;
  swapCount: number;
}

/**
 * Efficiently detect migrated tokens by scanning for DEX swap transactions
 * Uses getTransactionsForAddress for faster queries
 * This is MUCH faster than checking each token individually against DexScreener
 */
export async function getMigratedTokensFromSwapHistory(
  walletAddress: string,
  tokenMints: Set<string>
): Promise<Map<string, MigratedTokenInfo>> {
  // Use REST API directly (more reliable than RPC for this endpoint)
  return getMigratedTokensFromSwapHistoryLegacy(walletAddress, tokenMints);
}

/**
 * Legacy fallback for swap history detection
 */
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
        // Only count as migration if it's from a REAL DEX
        const source = (tx.source || '').toUpperCase();
        const isMigrationDex = MIGRATION_DEX_SOURCES.has(source);
        const isNonMigration = NON_MIGRATION_SOURCES.has(source);

        // Skip pump.fun bonding curve trades
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

/**
 * Get enhanced transaction history filtered by source (e.g., RAYDIUM, JUPITER)
 * Much more efficient than checking each token against DexScreener
 */
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

/**
 * Fast token scan using only DAS API (no transaction history lookups)
 * Use this for initial page loads to avoid timeouts
 */
export async function getTokensCreatedByWalletFast(walletAddress: string): Promise<{
  tokens: TokenCreated[];
  migrated: Map<string, MigratedTokenInfo>;
  totalTokens: number;
  migratedCount: number;
}> {
  // Only use DAS API creator lookup (fast, single paginated call)
  const tokens = await getTokensCreatedByWallet(walletAddress);

  // Return with empty migration data - can be enriched later
  return {
    tokens,
    migrated: new Map(),
    totalTokens: tokens.length,
    migratedCount: 0,
  };
}

/**
 * Full token analysis with efficient migration detection
 * Returns all tokens with migration status detected via transaction history
 * Note: This is slower - use getTokensCreatedByWalletFast for initial loads
 */
export async function getTokensWithMigrationStatus(walletAddress: string): Promise<{
  tokens: TokenCreated[];
  migrated: Map<string, MigratedTokenInfo>;
  totalTokens: number;
  migratedCount: number;
}> {
  // Step 1: Get all tokens created by wallet
  const tokens = await getAllTokensCreatedByWallet(walletAddress);
  const tokenMints = new Set(tokens.map(t => t.mintAddress));

  // Step 2: Efficiently detect migrations via swap history (single API scan)
  const migrated = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);

  return {
    tokens,
    migrated,
    totalTokens: tokens.length,
    migratedCount: migrated.size,
  };
}

export interface RugDetectionResult {
  isRug: boolean;
  severity: 'soft' | 'hard' | null;
  sellPercent: number;
  sellTimestampFirst?: number;
  sellTimestampLast?: number;
  totalReceived: number;
  totalSold: number;
}

/**
 * Detect if a dev rugged a token by analyzing their sell pattern
 * Hard rug: Dev sold >90% within 24h of launch
 * Soft rug: Dev sold >80% within 48h, or liquidity pulled
 *
 * @param devWallet - The dev's wallet address
 * @param mintAddress - The token mint address
 * @param launchTimestamp - Optional launch timestamp (if known)
 * @returns Rug detection result
 */
export async function detectRugPattern(
  devWallet: string,
  mintAddress: string,
  launchTimestamp?: number
): Promise<RugDetectionResult> {
  try {
    // Get token transfers for this dev and mint
    const transfers = await getTokenTransfersForWallet(devWallet, mintAddress, { limit: 200 });

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

    // Sort by timestamp to analyze chronologically
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

    // Determine if this is a rug and its severity
    let isRug = false;
    let severity: 'soft' | 'hard' | null = null;

    if (sellPercent >= 90) {
      // Check timing - did they dump fast?
      const launchTime = launchTimestamp || sortedTransfers[0]?.timestamp || 0;
      const timeSinceLaunch = firstSellTimestamp ? firstSellTimestamp - launchTime : 0;
      const sellDuration = lastSellTimestamp && firstSellTimestamp ?
        lastSellTimestamp - firstSellTimestamp : 0;

      // Hard rug: 90%+ sold, mostly within 24h of launch
      const HOURS_24 = 24 * 60 * 60;
      if (timeSinceLaunch < HOURS_24 && sellDuration < HOURS_24) {
        isRug = true;
        severity = 'hard';
      } else if (sellPercent >= 95) {
        // Even slower dumps of 95%+ are hard rugs
        isRug = true;
        severity = 'hard';
      } else {
        isRug = true;
        severity = 'soft';
      }
    } else if (sellPercent >= 80) {
      // Soft rug: sold 80-90%
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
    // Silently fail - rug detection is best-effort and shouldn't block profile loading
    return {
      isRug: false,
      severity: null,
      sellPercent: 0,
      totalReceived: 0,
      totalSold: 0,
    };
  }
}

/**
 * Get all tokens created by a wallet with VERIFIED creator status
 * Combines DAS API (for non-pump.fun tokens) and feePayer verification (for pump.fun tokens)
 * This is the primary discovery method that should be used for profile data
 *
 * @param walletAddress - The wallet to scan for created tokens
 * @returns Verified tokens created by this wallet
 */
export async function getTokensCreatedByWalletVerified(walletAddress: string): Promise<{
  tokens: TokenCreated[];
  migrated: Map<string, MigratedTokenInfo>;
  totalTokens: number;
  migratedCount: number;
}> {
  const tokenMap = new Map<string, TokenCreated>();

  // Method 1: Standard DAS API creator lookup (fast, works for non-pump.fun tokens)
  const dasTokens = await getTokensCreatedByWallet(walletAddress);
  for (const token of dasTokens) {
    tokenMap.set(token.mintAddress, {
      ...token,
      creationVerified: false, // DAS doesn't provide feePayer verification
    });
  }

  // Method 2: FeePayer-based discovery for pump.fun tokens (slower but accurate)
  const feePayerTokens = await getTokensCreatedByWalletViaFeePayer(walletAddress);
  for (const token of feePayerTokens) {
    // FeePayer verified tokens take precedence
    tokenMap.set(token.mintAddress, token);
  }

  const tokens = Array.from(tokenMap.values());
  const tokenMints = new Set(tokens.map(t => t.mintAddress));

  // Detect migrations via swap history
  const migrated = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);

  return {
    tokens,
    migrated,
    totalTokens: tokens.length,
    migratedCount: migrated.size,
  };
}

/**
 * Sleep helper for rate limiting
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get holder count for a single token
 * Paginates through all token accounts and deduplicates by owner
 * Note: For tokens with many holders (10K+), this can be slow
 *
 * @param mintAddress - The token mint address
 * @returns Number of unique holders with non-zero balance
 */
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

      // Deduplicate by owner (wallet can have multiple token accounts)
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

/**
 * Get holder counts for multiple tokens in parallel batches
 * Respects Helius rate limits with concurrency control and delays
 *
 * @param mintAddresses - Array of token mint addresses
 * @returns Map of mint address to holder count
 */
export async function batchGetHolderCounts(
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  // Process in parallel with concurrency limit to respect rate limits
  const CONCURRENCY = 5;

  for (let i = 0; i < mintAddresses.length; i += CONCURRENCY) {
    const batch = mintAddresses.slice(i, i + CONCURRENCY);

    const batchResults = await Promise.all(
      batch.map(mint => getHolderCount(mint))
    );

    for (let j = 0; j < batch.length; j++) {
      results.set(batch[j], batchResults[j]);
    }

    // Small delay between batches to avoid rate limits
    if (i + CONCURRENCY < mintAddresses.length) {
      await sleep(100);
    }
  }

  return results;
}

/**
 * Quick holder count - fetches first page only
 * For tokens with >1000 holders, this undercounts but is much faster
 * Use getHolderCount() for accurate counts on large tokens
 *
 * @param mintAddress - The token mint address
 * @returns Approximate holder count (capped at 1000 per page)
 */
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

    // Count unique owners from this page
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

/**
 * Smart holder count - uses quick method first, then full pagination if needed
 * This ensures tokens with 5000+ holders get accurate counts for max score tier
 *
 * @param mintAddress - The token mint address
 * @returns Accurate holder count for scoring purposes
 */
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

      // For scoring, we only need to know if holders >= 5000 (max tier)
      // Stop early if we've already confirmed max tier
      if (uniqueOwners.size >= 5000) {
        return uniqueOwners.size;
      }

      // Also stop if first page has no cursor (small token)
      if (!cursor) {
        break;
      }
    } while (cursor && pageCount < 10); // Cap at 10 pages (~10K holders)

    return uniqueOwners.size;
  } catch {
    return 0;
  }
}

/**
 * Get quick holder counts for multiple tokens
 * Uses the quick single-page method for speed
 *
 * @param mintAddresses - Array of token mint addresses
 * @returns Map of mint address to approximate holder count
 */
export async function batchGetHolderCountsQuick(
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  // High concurrency - dev plan supports 50+ RPS
  const CONCURRENCY = 25;

  // Process all batches in parallel for maximum speed
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

/**
 * Get dev's current holding percentage for a token
 * Calculates what % of total supply the dev wallet still holds
 *
 * @param devWallet - The dev's wallet address
 * @param mintAddress - The token mint address
 * @returns Percentage of supply held (0-100)
 */
export async function getDevHoldingPercent(
  devWallet: string,
  mintAddress: string
): Promise<number> {
  try {
    // Get dev's token accounts for this mint
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

    // Sum all dev's holdings
    const devBalance = result.token_accounts.reduce(
      (sum, account) => sum + account.amount,
      0
    );

    if (devBalance === 0) {
      return 0;
    }

    // Get token info for total supply
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

/**
 * Batch get dev holding percentages for multiple tokens
 *
 * @param devWallet - The dev's wallet address
 * @param mintAddresses - Array of token mint addresses
 * @returns Map of mint address to holding percentage
 */
export async function batchGetDevHoldings(
  devWallet: string,
  mintAddresses: string[]
): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  if (mintAddresses.length === 0) {
    return results;
  }

  // High concurrency - dev plan supports 50+ RPS
  const CONCURRENCY = 25;

  // Process all batches in parallel for maximum speed
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
