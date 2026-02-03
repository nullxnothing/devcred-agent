import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenByMint, upsertToken, getWalletsByUserId } from '@/lib/db';
import { getAssetByMint, verifyTokenCreator } from '@/lib/helius';
import { getMigrationStatusCombined } from '@/lib/dexscreener';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { PublicKey } from '@solana/web3.js';

// Pump.fun program ID for reliable token type detection
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

/**
 * Check if a token was created via pump.fun program
 * Uses transaction history inspection instead of unreliable address suffix matching
 */
async function isPumpFunToken(mintAddress: string): Promise<boolean> {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) return false;

    // Fetch early transactions for this mint
    const url = `https://api.helius.xyz/v0/addresses/${mintAddress}/transactions?api-key=${heliusApiKey}&limit=20`;
    const response = await fetch(url);

    if (!response.ok) return false;

    const transactions = await response.json();
    if (!Array.isArray(transactions) || transactions.length === 0) return false;

    // Check if any transaction involves pump.fun program
    for (const tx of transactions) {
      const txJson = JSON.stringify(tx);
      if (txJson.includes(PUMP_FUN_PROGRAM)) {
        // Found pump.fun involvement - check if it's a creation tx
        if (tx.type === 'CREATE' || tx.source === 'PUMP_FUN' || tx.description?.toLowerCase().includes('create')) {
          return true;
        }
      }
    }

    return false;
  } catch {
    // On error, fall back to address suffix check (less reliable but better than nothing)
    return mintAddress.endsWith('pump');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('token-claim', session.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.tokenClaim);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { mintAddress } = await request.json();

    if (!mintAddress) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }

    // Validate mint address format
    try {
      new PublicKey(mintAddress);
    } catch {
      return NextResponse.json({ error: 'Invalid mint address format' }, { status: 400 });
    }

    // Check if token is already claimed
    const existingToken = await getTokenByMint(mintAddress);
    if (existingToken?.user_id) {
      return NextResponse.json({ error: 'Token is already claimed by another user' }, { status: 400 });
    }

    // Get user's verified wallets
    const userWallets = await getWalletsByUserId(session.user.id);
    if (userWallets.length === 0) {
      return NextResponse.json(
        { error: 'You need to connect and verify a wallet first' },
        { status: 400 }
      );
    }

    // Fetch token info from Helius
    const asset = await getAssetByMint(mintAddress);
    if (!asset) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Detect pump.fun tokens via program ID verification (not address suffix)
    // Addresses ending in 'pump' is a naming convention, not reliable detection
    // We check if the token was created via pump.fun program by verifying creation tx
    const isPumpToken = await isPumpFunToken(mintAddress);

    let creatorWallet = '';
    let creationSignature: string | undefined;
    let creationTimestamp: number | undefined;
    let creationVerified = false;

    if (isPumpToken) {
      // For pump.fun tokens, verify via feePayer
      // Check each user wallet to see if any is the creator
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
        return NextResponse.json(
          {
            error: 'You are not the creator of this token',
            details: 'For pump.fun tokens, only the wallet that paid the creation transaction fee can claim it.'
          },
          { status: 403 }
        );
      }
    } else {
      // For non-pump.fun tokens, use the traditional authority-based check
      if (asset.authorities && asset.authorities.length > 0) {
        const mintAuth = asset.authorities.find((a) => a.scopes.includes('mint'));
        const updateAuth = asset.authorities.find((a) => a.scopes.includes('metadata'));
        creatorWallet = mintAuth?.address || updateAuth?.address || asset.authorities[0].address;
      }

      // Fallback to creators array
      if (!creatorWallet && asset.creators && asset.creators.length > 0) {
        creatorWallet = asset.creators[0].address;
      }

      // Fallback to ownership
      if (!creatorWallet && asset.ownership?.owner) {
        creatorWallet = asset.ownership.owner;
      }

      if (!creatorWallet) {
        return NextResponse.json(
          { error: 'Could not determine token creator' },
          { status: 400 }
        );
      }

      // Verify user owns the creator wallet
      const userWalletAddresses = new Set(userWallets.map((w) => w.address.toLowerCase()));
      if (!userWalletAddresses.has(creatorWallet.toLowerCase())) {
        return NextResponse.json(
          { error: 'You must verify ownership of the creator wallet to claim this token' },
          { status: 403 }
        );
      }
    }

    // Get migration status
    const migrationStatus = await getMigrationStatusCombined(mintAddress);

    // Claim the token with enhanced data
    const token = await upsertToken({
      mint_address: mintAddress,
      name: asset.content?.metadata?.name || 'Unknown Token',
      symbol: asset.content?.metadata?.symbol || '???',
      creator_wallet: creatorWallet,
      user_id: session.user.id,
      launch_date: creationTimestamp
        ? new Date(creationTimestamp * 1000).toISOString()
        : new Date().toISOString(),
      migrated: migrationStatus.migrated,
      migrated_at: migrationStatus.migratedAt?.toISOString(),
      status: 'active',
      score: migrationStatus.migrated ? 50 : 10, // Base score, will be recalculated on profile view
      metadata: {
        creation_signature: creationSignature,
        creation_verified: creationVerified,
        migration_pool_address: migrationStatus.migrationPoolAddress,
      },
    });

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Failed to claim token' }, { status: 500 });
  }
}
