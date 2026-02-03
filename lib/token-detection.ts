/**
 * Token Detection Module v2
 *
 * Accurate detection of tokens created by a wallet, specifically designed for pump.fun tokens.
 *
 * Why this approach:
 * - getAssetsByCreator looks for verified creators in metadata, which pump.fun doesn't set
 * - The pump.fun program (6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P) is the technical "creator" of the mint
 * - The REAL dev wallet is the Transaction.Signer (first signer) on the create instruction
 *
 * Detection Strategy:
 * 1. Pump.fun tokens: Find transactions where wallet signed pump.fun create instructions
 * 2. Standard SPL tokens: Check if wallet is/was the mint authority
 * 3. Skip false positives: Raydium LP tokens (AMM is creator), airdrops (no create tx)
 */

import { rateLimitedFetchWithRetry } from './helius/rate-limiter';

// Helius endpoint helpers (lazy evaluation for env loading)
const getHeliusRpcUrl = () => `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const getHeliusApiUrl = () => `https://api.helius.xyz/v0`;

// Program IDs
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

// System tokens to exclude (not user-created)
const SYSTEM_TOKEN_MINTS = new Set([
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs', // ETH (Wormhole)
]);

export interface DetectedToken {
  mintAddress: string;
  name: string;
  symbol: string;
  creatorAddress: string;
  supply: number;
  decimals: number;
  pricePerToken?: number;
  // Creation verification
  creationSignature: string;
  creationTimestamp: number;
  creationMethod: 'pump_fun_create' | 'spl_mint_authority' | 'token_2022_mint_authority';
  // Confidence: how certain we are this wallet created this token
  confidence: 'high' | 'medium' | 'low';
}

export interface TokenDetectionResult {
  tokens: DetectedToken[];
  totalFound: number;
  pumpFunCount: number;
  splCount: number;
  skippedCount: number;
  scanDuration: number;
}

interface HeliusParsedTransaction {
  signature: string;
  timestamp: number;
  type: string;
  source: string;
  description: string;
  fee: number;
  feePayer: string;
  instructions?: HeliusInstruction[];
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
}

interface HeliusInstruction {
  programId: string;
  accounts: string[];
  data?: string;
  innerInstructions?: HeliusInstruction[];
}

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
    };
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
}


/**
 * Execute Helius RPC call
 */
async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await rateLimitedFetchWithRetry(getHeliusRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'token-detection',
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`Helius RPC error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(`Helius RPC error: ${data.error.message}`);
  }

  return data.result as T;
}

/**
 * Get token metadata from Helius DAS API
 */
async function getTokenMetadata(mintAddress: string): Promise<HeliusAsset | null> {
  try {
    return await heliusRpc<HeliusAsset>('getAsset', { id: mintAddress });
  } catch {
    return null;
  }
}

/**
 * Batch fetch token metadata - much faster than sequential calls
 * Uses getAssetBatch which supports up to 1000 assets at once
 */
async function batchGetTokenMetadata(
  mintAddresses: string[]
): Promise<Map<string, HeliusAsset | null>> {
  const results = new Map<string, HeliusAsset | null>();

  if (mintAddresses.length === 0) {
    return results;
  }

  const BATCH_SIZE = 1000; // Helius supports up to 1000

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

      // Fill in nulls for mints not returned
      for (const mint of batch) {
        if (!results.has(mint)) {
          results.set(mint, null);
        }
      }
    } catch {
      // On error, set all to null
      for (const mint of batch) {
        results.set(mint, null);
      }
    }
  }

  return results;
}

/**
 * Fetch parsed transactions for a wallet from Helius
 */
async function fetchWalletTransactions(
  walletAddress: string,
  options: { before?: string; limit?: number } = {}
): Promise<HeliusParsedTransaction[]> {
  const { before, limit = 100 } = options;

  let url = `${getHeliusApiUrl()}/addresses/${walletAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=${limit}`;
  if (before) {
    url += `&before=${before}`;
  }

  const response = await rateLimitedFetchWithRetry(url, { method: 'GET' });

  if (!response.ok) {
    if (response.status === 400) {
      return []; // Invalid address or no transactions
    }
    throw new Error(`Helius API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Check if a transaction contains a pump.fun create instruction
 * Returns the mint address if found, null otherwise
 */
function extractPumpFunCreateMint(
  tx: HeliusParsedTransaction,
  walletAddress: string
): string | null {
  // Must be the fee payer (signer) of the transaction
  if (tx.feePayer?.toLowerCase() !== walletAddress.toLowerCase()) {
    return null;
  }

  // Check if transaction involves pump.fun program
  const txJson = JSON.stringify(tx);
  if (!txJson.includes(PUMP_FUN_PROGRAM)) {
    return null;
  }

  // Look for pump.fun create indicators:
  // 1. Transaction type is CREATE
  // 2. Description mentions "create"
  // 3. Source is PUMP_FUN
  const isCreateType = tx.type === 'CREATE';
  const hasCreateInDescription = tx.description?.toLowerCase().includes('create');
  const isPumpFunSource = tx.source === 'PUMP_FUN';

  if (!isCreateType && !hasCreateInDescription && !isPumpFunSource) {
    // Not a create transaction
    return null;
  }

  // Find the mint address from token transfers
  // In a pump.fun create, the dev receives tokens
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    for (const transfer of tx.tokenTransfers) {
      // Dev should receive tokens (dev allocation)
      const isRecipient = transfer.toUserAccount?.toLowerCase() === walletAddress.toLowerCase();
      // Skip system tokens
      const isSystemToken = SYSTEM_TOKEN_MINTS.has(transfer.mint);
      // Should have a meaningful amount
      const hasAmount = transfer.tokenAmount > 0;

      if (isRecipient && !isSystemToken && hasAmount) {
        return transfer.mint;
      }
    }
  }

  return null;
}

/**
 * Check if transaction is an SPL token mint authority action
 * (When wallet created a standard SPL token, not pump.fun)
 */
function extractSPLMintCreate(
  tx: HeliusParsedTransaction,
  walletAddress: string
): string | null {
  // Must be the fee payer
  if (tx.feePayer?.toLowerCase() !== walletAddress.toLowerCase()) {
    return null;
  }

  // Look for CREATE type with Token Program
  if (tx.type !== 'CREATE') {
    return null;
  }

  // Must NOT be pump.fun
  const txJson = JSON.stringify(tx);
  if (txJson.includes(PUMP_FUN_PROGRAM)) {
    return null;
  }

  // Must involve Token Program
  const involvesTokenProgram = txJson.includes(TOKEN_PROGRAM) || txJson.includes(TOKEN_2022_PROGRAM);
  if (!involvesTokenProgram) {
    return null;
  }

  // Extract mint from token transfers
  if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
    for (const transfer of tx.tokenTransfers) {
      if (!SYSTEM_TOKEN_MINTS.has(transfer.mint) && transfer.tokenAmount > 0) {
        return transfer.mint;
      }
    }
  }

  return null;
}

/**
 * Check if a mint is an AMM/LP token (should be skipped)
 */
async function isLPToken(mintAddress: string): Promise<boolean> {
  const asset = await getTokenMetadata(mintAddress);
  if (!asset) return false;

  const name = asset.content?.metadata?.name?.toLowerCase() || '';
  const symbol = asset.content?.metadata?.symbol?.toLowerCase() || '';

  // LP token indicators
  const lpIndicators = ['lp', 'pool', 'liquidity', 'amm', 'swap'];
  for (const indicator of lpIndicators) {
    if (name.includes(indicator) || symbol.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * MAIN FUNCTION: Detect all tokens created by a wallet
 *
 * This is the correct way to find tokens created by a wallet:
 * 1. Scan wallet's transaction history
 * 2. Find transactions where wallet was the SIGNER on create instructions
 * 3. For pump.fun: wallet must be feePayer on pump.fun create tx
 * 4. For SPL: wallet must be feePayer on token mint creation
 *
 * @param walletAddress - The wallet to scan for created tokens
 * @param options - Scan options
 * @returns Detected tokens with verification data
 */
export async function detectTokensCreatedByWallet(
  walletAddress: string,
  options: {
    maxPages?: number;
    includeMetadata?: boolean;
  } = {}
): Promise<TokenDetectionResult> {
  const startTime = Date.now();
  const { maxPages = 10, includeMetadata = true } = options; // Reduced from 30

  const detectedMints = new Map<string, {
    signature: string;
    timestamp: number;
    method: 'pump_fun_create' | 'spl_mint_authority' | 'token_2022_mint_authority';
  }>();

  let skippedCount = 0;
  let before: string | undefined;
  let page = 0;

  // Scan transaction history
  while (page < maxPages) {
    const transactions = await fetchWalletTransactions(walletAddress, { before, limit: 100 });

    if (transactions.length === 0) break;

    for (const tx of transactions) {
      // Check for pump.fun create
      const pumpMint = extractPumpFunCreateMint(tx, walletAddress);
      if (pumpMint && !detectedMints.has(pumpMint)) {
        detectedMints.set(pumpMint, {
          signature: tx.signature,
          timestamp: tx.timestamp,
          method: 'pump_fun_create',
        });
        continue;
      }

      // Check for standard SPL create
      const splMint = extractSPLMintCreate(tx, walletAddress);
      if (splMint && !detectedMints.has(splMint)) {
        // Check if it's an LP token (skip those)
        const isLP = await isLPToken(splMint);
        if (isLP) {
          skippedCount++;
          continue;
        }

        detectedMints.set(splMint, {
          signature: tx.signature,
          timestamp: tx.timestamp,
          method: 'spl_mint_authority',
        });
      }
    }

    // Pagination
    before = transactions[transactions.length - 1].signature;
    page++;

    // Early exit if we got less than a full page
    if (transactions.length < 100) break;
  }

  // Build final token list with metadata - use BATCH fetch for speed
  const tokens: DetectedToken[] = [];
  let pumpFunCount = 0;
  let splCount = 0;

  // Batch fetch all metadata at once (instead of N sequential calls)
  const mintAddresses = Array.from(detectedMints.keys());
  const metadataMap = includeMetadata
    ? await batchGetTokenMetadata(mintAddresses)
    : new Map<string, HeliusAsset | null>();

  for (const [mintAddress, createInfo] of detectedMints) {
    let name = 'Unknown';
    let symbol = 'UNKNOWN';
    let supply = 0;
    let decimals = 0;
    let pricePerToken: number | undefined;

    if (includeMetadata) {
      const asset = metadataMap.get(mintAddress);
      if (asset) {
        name = asset.content?.metadata?.name || 'Unknown';
        symbol = asset.content?.metadata?.symbol || 'UNKNOWN';
        supply = asset.token_info?.supply || 0;
        decimals = asset.token_info?.decimals || 0;
        pricePerToken = asset.token_info?.price_info?.price_per_token;
      }
    }

    // Count by method
    if (createInfo.method === 'pump_fun_create') {
      pumpFunCount++;
    } else {
      splCount++;
    }

    tokens.push({
      mintAddress,
      name,
      symbol,
      creatorAddress: walletAddress,
      supply,
      decimals,
      pricePerToken,
      creationSignature: createInfo.signature,
      creationTimestamp: createInfo.timestamp,
      creationMethod: createInfo.method,
      confidence: 'high', // We verified via transaction signer
    });
  }

  // Sort by creation timestamp (newest first)
  tokens.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

  return {
    tokens,
    totalFound: tokens.length,
    pumpFunCount,
    splCount,
    skippedCount,
    scanDuration: Date.now() - startTime,
  };
}

/**
 * Verify if a specific wallet created a specific token
 * More efficient than full scan when you already know the mint
 *
 * @param walletAddress - The wallet to verify as creator
 * @param mintAddress - The token mint to check
 * @returns Verification result
 */
export async function verifyTokenCreation(
  walletAddress: string,
  mintAddress: string
): Promise<{
  isCreator: boolean;
  signature?: string;
  timestamp?: number;
  method?: 'pump_fun_create' | 'spl_mint_authority' | 'token_2022_mint_authority';
  confidence: 'high' | 'medium' | 'low' | 'none';
}> {
  // Fetch transactions for the MINT address (not wallet)
  // This is more efficient - we look at the token's history to find creation
  const url = `${getHeliusApiUrl()}/addresses/${mintAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=50`;

  const response = await rateLimitedFetchWithRetry(url, { method: 'GET' });
  if (!response.ok) {
    return { isCreator: false, confidence: 'none' };
  }

  const transactions: HeliusParsedTransaction[] = await response.json();
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { isCreator: false, confidence: 'none' };
  }

  // Sort by timestamp (oldest first) to find creation
  const sorted = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  // Check earliest transactions for creation
  for (const tx of sorted.slice(0, 10)) {
    // Check if wallet was the feePayer (signer)
    if (tx.feePayer?.toLowerCase() !== walletAddress.toLowerCase()) {
      continue;
    }

    const txJson = JSON.stringify(tx);
    const isPumpFun = txJson.includes(PUMP_FUN_PROGRAM);
    const isCreate = tx.type === 'CREATE' || tx.description?.toLowerCase().includes('create');

    if (isPumpFun && isCreate) {
      return {
        isCreator: true,
        signature: tx.signature,
        timestamp: tx.timestamp,
        method: 'pump_fun_create',
        confidence: 'high',
      };
    }

    if (isCreate && (txJson.includes(TOKEN_PROGRAM) || txJson.includes(TOKEN_2022_PROGRAM))) {
      return {
        isCreator: true,
        signature: tx.signature,
        timestamp: tx.timestamp,
        method: txJson.includes(TOKEN_2022_PROGRAM) ? 'token_2022_mint_authority' : 'spl_mint_authority',
        confidence: 'high',
      };
    }
  }

  return { isCreator: false, confidence: 'none' };
}

/**
 * Quick check if a wallet has created any tokens
 * Useful for validating dev wallets before full scan
 */
export async function hasCreatedTokens(walletAddress: string): Promise<boolean> {
  const result = await detectTokensCreatedByWallet(walletAddress, {
    maxPages: 5, // Quick scan
    includeMetadata: false,
  });
  return result.totalFound > 0;
}
