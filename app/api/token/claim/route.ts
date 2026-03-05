import { NextRequest } from 'next/server';
import { getTokenByMint, getWalletsByUserId, pool } from '@/lib/db';
import { getAssetByMint, verifyTokenCreator } from '@/lib/helius';
import { getMigrationStatusCombined } from '@/lib/dexscreener';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { PublicKey } from '@solana/web3.js';
import { apiOk, apiRateLimited, apiBadRequest, apiForbidden, apiNotFound, apiError } from '@/lib/api-response';
import { validateBody } from '@/lib/api-validation';
import { mintAddressSchema } from '@/lib/validation';
import { requireNextAuth } from '@/lib/api-auth';

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

async function isPumpFunToken(mintAddress: string): Promise<boolean> {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) return false;

    const url = `https://api.helius.xyz/v0/addresses/${mintAddress}/transactions?api-key=${heliusApiKey}&limit=20`;
    const response = await fetch(url);

    if (!response.ok) return false;

    const transactions = await response.json();
    if (!Array.isArray(transactions) || transactions.length === 0) return false;

    for (const tx of transactions) {
      const txJson = JSON.stringify(tx);
      if (txJson.includes(PUMP_FUN_PROGRAM)) {
        if (tx.type === 'CREATE' || tx.source === 'PUMP_FUN' || tx.description?.toLowerCase().includes('create')) {
          return true;
        }
      }
    }

    return false;
  } catch {
    return mintAddress.endsWith('pump');
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireNextAuth();
    if (auth.error) return auth.error;

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('token-claim', auth.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.tokenClaim);
    if (!rateLimit.allowed) {
      return apiRateLimited(rateLimit, 'Too many requests. Please try again later.');
    }

    // Validate request body
    const validation = await validateBody(request, mintAddressSchema);
    if (validation.error) return validation.error;
    const { mintAddress } = validation.data;

    // Validate mint address format
    try {
      new PublicKey(mintAddress);
    } catch {
      return apiBadRequest('Invalid mint address format');
    }

    // Check if token is already claimed (preliminary check — atomic guard in upsert below)
    const existingToken = await getTokenByMint(mintAddress);
    if (existingToken?.user_id) {
      return apiBadRequest('Token is already claimed by another user');
    }

    // Atomic guard: if another request claims between check and upsert,
    // the ON CONFLICT will not overwrite user_id (see upsert below)

    // Get user's verified wallets
    const userWallets = await getWalletsByUserId(auth.user.id);
    if (userWallets.length === 0) {
      return apiBadRequest('You need to connect and verify a wallet first');
    }

    // Fetch token info from Helius
    const asset = await getAssetByMint(mintAddress);
    if (!asset) {
      return apiNotFound('Token');
    }

    const isPumpToken = await isPumpFunToken(mintAddress);

    let creatorWallet = '';
    let creationSignature: string | undefined;
    let creationTimestamp: number | undefined;
    let creationVerified = false;

    if (isPumpToken) {
      for (const wallet of userWallets) {
        const verification = await verifyTokenCreator(wallet.address, mintAddress);
        if (verification.isCreator) {
          creatorWallet = wallet.address;
          creationSignature = verification.creationSignature;
          creationTimestamp = verification.creationTimestamp;
          creationVerified = true;
          break;
        }
      }

      if (!creatorWallet) {
        return apiForbidden(
          'You are not the creator of this token. For pump.fun tokens, only the wallet that paid the creation transaction fee can claim it.'
        );
      }
    } else {
      if (asset.authorities && asset.authorities.length > 0) {
        const mintAuth = asset.authorities.find((a) => a.scopes.includes('mint'));
        const updateAuth = asset.authorities.find((a) => a.scopes.includes('metadata'));
        creatorWallet = mintAuth?.address || updateAuth?.address || asset.authorities[0].address;
      }

      if (!creatorWallet && asset.creators && asset.creators.length > 0) {
        creatorWallet = asset.creators[0].address;
      }

      if (!creatorWallet && asset.ownership?.owner) {
        creatorWallet = asset.ownership.owner;
      }

      if (!creatorWallet) {
        return apiBadRequest('Could not determine token creator');
      }

      const userWalletAddresses = new Set(userWallets.map((w) => w.address.toLowerCase()));
      if (!userWalletAddresses.has(creatorWallet.toLowerCase())) {
        return apiForbidden('You must verify ownership of the creator wallet to claim this token');
      }
    }

    const migrationStatus = await getMigrationStatusCombined(mintAddress);

    // Atomic claim: only set user_id if currently NULL (prevents race condition)
    const claimResult = await pool.query(
      `INSERT INTO dk_tokens (
         mint_address, name, symbol, creator_wallet, user_id, launch_date,
         migrated, migrated_at, status, score, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (mint_address) DO UPDATE SET
         name = EXCLUDED.name,
         symbol = EXCLUDED.symbol,
         creator_wallet = EXCLUDED.creator_wallet,
         user_id = CASE WHEN dk_tokens.user_id IS NULL THEN EXCLUDED.user_id ELSE dk_tokens.user_id END,
         migrated = EXCLUDED.migrated,
         migrated_at = COALESCE(EXCLUDED.migrated_at, dk_tokens.migrated_at),
         status = EXCLUDED.status,
         score = EXCLUDED.score,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        mintAddress,
        asset.content?.metadata?.name || 'Unknown Token',
        asset.content?.metadata?.symbol || '???',
        creatorWallet,
        auth.user.id,
        creationTimestamp ? new Date(creationTimestamp * 1000).toISOString() : new Date().toISOString(),
        migrationStatus.migrated,
        migrationStatus.migratedAt?.toISOString() || null,
        'active',
        migrationStatus.migrated ? 50 : 10,
        JSON.stringify({
          creation_signature: creationSignature,
          creation_verified: creationVerified,
          migration_pool_address: migrationStatus.migrationPoolAddress,
        }),
      ]
    );

    const token = claimResult.rows[0];

    // If user_id didn't get set to ours, another request claimed it first
    if (token.user_id !== auth.user.id) {
      return apiBadRequest('Token was claimed by another user');
    }

    return apiOk({
      success: true,
      token: {
        mint: token.mint_address,
        name: token.name,
        symbol: token.symbol,
        verified: creationVerified,
      },
    });
  } catch (error) {
    console.error('Token claim error:', error);
    return apiError(error);
  }
}
