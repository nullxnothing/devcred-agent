import { NextRequest, NextResponse } from 'next/server';
import { getUserByTwitterHandle, getUserByAnyWallet, getTokensForUserWallets } from '@/lib/db';
import { PublicKey } from '@solana/web3.js';
import { apiOk, apiError, withCache } from '@/lib/api-response';

interface RouteContext {
  params: Promise<{ handle: string }>;
}

/**
 * GET /api/profile/[handle]/badges
 * Returns token data for badge calculation (lightweight endpoint for hover cards)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { handle } = await context.params;
    const decodedHandle = decodeURIComponent(handle);

    // Try to find user by Twitter handle first
    let user = await getUserByTwitterHandle(decodedHandle);

    // If not found, check if it's a wallet address (lookup only, no auto-create)
    if (!user) {
      try {
        new PublicKey(decodedHandle);
        user = await getUserByAnyWallet(decodedHandle);
      } catch {
        // Not a valid Solana address
      }
    }

    if (!user) {
      return withCache(apiOk({ tokens: [] }), 60, 120);
    }

    // Get tokens for user
    const tokens = await getTokensForUserWallets(user.id);

    // Return minimal token data needed for badge calculation
    const badgeTokens = tokens.map(token => ({
      mint: token.mint_address,
      name: token.name,
      symbol: token.symbol,
      athMarketCap: token.ath_market_cap,
      migrated: token.migrated,
      migratedAt: token.migrated_at,
      holderCount: token.holder_count,
      score: token.score,
    }));

    // Cache badges for 60 seconds, stale for 120 more
    return withCache(apiOk({ tokens: badgeTokens }), 60, 120);
  } catch (error) {
    console.error('[GET /api/profile/[handle]/badges] Error:', error);
    return apiError(error);
  }
}
