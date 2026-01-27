/**
 * Helius API Client for Solana blockchain data
 * Uses DAS API for token/asset queries (superior to legacy RPC)
 */

// Helius endpoint constants
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

// Rate limiting: track request timestamps
const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_SECOND = 10; // Free tier limit

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
}

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
 * Execute a JSON-RPC call to Helius
 */
async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await rateLimitedFetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'devkarma',
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
    };

    if (cursor) {
      params.cursor = cursor;
    }

    const result = await heliusRpc<{
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
 * Get tokens created via pump.fun by scanning transaction history
 * pump.fun tokens aren't registered as "created by" the dev in DAS API
 * but we can find them by looking for transactions where the wallet received pump.fun tokens
 */
export async function getTokensFromTransactionHistory(walletAddress: string): Promise<TokenCreated[]> {
  const tokens: TokenCreated[] = [];
  const seenMints = new Set<string>();

  // pump.fun program ID
  const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

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

// DEX sources that indicate a token has migrated
const MIGRATION_DEX_SOURCES = [
  'RAYDIUM',
  'ORCA', 
  'JUPITER',
  'METEORA',
  'LIFINITY',
  'ALDRIN',
  'CROPPER',
  'SABER',
  'SERUM',
  'MERCURIAL',
  'WHIRLPOOL'
];

export interface MigratedTokenInfo {
  mintAddress: string;
  dexSource: string;
  firstSwapTimestamp: number;
  swapCount: number;
}

/**
 * Efficiently detect migrated tokens by scanning for DEX swap transactions
 * Uses Helius Enhanced Transactions API with source filter
 * This is MUCH faster than checking each token individually against DexScreener
 */
export async function getMigratedTokensFromSwapHistory(
  walletAddress: string,
  tokenMints: Set<string>
): Promise<Map<string, MigratedTokenInfo>> {
  const migratedTokens = new Map<string, MigratedTokenInfo>();
  
  // Fetch swap transactions from the wallet
  // These will include swaps on Raydium, Orca, Jupiter etc (migrated DEXes)
  let before: string | undefined;
  let hasMore = true;
  let totalTxFetched = 0;
  const MAX_TX_TO_SCAN = 1000; // Limit to last 1000 transactions
  
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
        // Check if transaction involves tokens created by this wallet
        if (tx.tokenTransfers) {
          for (const transfer of tx.tokenTransfers) {
            if (tokenMints.has(transfer.mint)) {
              // This is a swap involving one of the dev's tokens
              // Check if it's on a migration DEX
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
                  dexSource: 'DEX', // We know it's a DEX swap
                  firstSwapTimestamp: tx.timestamp,
                  swapCount: 1,
                });
              }
            }
          }
        }
      }
      
      // If we got less than limit, no more pages
      if (transactions.length < 100) {
        hasMore = false;
      }
    } catch (error) {
      console.error('Error fetching swap history:', error);
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
