import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserById,
  getWalletsByUserId,
  upsertToken,
  updateUser,
  addScoreHistory,
  getTokensForUserWallets
} from '@/lib/db';
import { scanWalletQuick } from '@/lib/wallet-scan';
import { calculateDevScore } from '@/lib/scoring';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting - sync is expensive (calls Helius API)
    const rateLimitId = getRateLimitIdentifier('user-sync', session.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.userSync);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Sync limit reached. Please wait before syncing again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const userId = session.user.id;
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const wallets = await getWalletsByUserId(userId);

    if (wallets.length === 0) {
      return NextResponse.json({
        message: 'No wallets linked',
        tokensFound: 0,
        score: 0,
      });
    }

    let totalTokensFound = 0;
    const allTokenScores: Array<{ score: number; migrated: boolean; launchDate: Date }> = [];

    // Scan all wallets using optimized batch API calls
    for (const wallet of wallets) {
      try {
        // Use NEW optimized wallet scan (batched API calls)
        const scanResult = await scanWalletQuick(wallet.address);

        // Save each token to database
        for (const token of scanResult.tokensCreated) {
          totalTokensFound++;

          await upsertToken({
            mint_address: token.mintAddress,
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNK',
            creator_wallet: wallet.address,
            user_id: userId,
            launch_date: new Date(token.launchedAt * 1000).toISOString(),
            migrated: token.migrated,
            migrated_at: token.migrated ? new Date().toISOString() : null,
            current_market_cap: token.marketCap ? Math.round(token.marketCap) : null,
            ath_market_cap: token.marketCap ? Math.round(token.marketCap) : null,
            total_volume: null,
            score: token.score.total,
            status: token.isRugged ? 'rug' : 'active',
            metadata: {
              holders: token.currentHolders,
              dev_holding_percent: token.devHoldingPercent,
            },
          });

          allTokenScores.push({
            score: token.score.total,
            migrated: token.migrated,
            launchDate: new Date(token.launchedAt * 1000),
          });
        }
      } catch (walletError) {
        console.error(`Error syncing wallet ${wallet.address}:`, walletError);
        // Continue with other wallets
      }
    }

    // Calculate overall dev score
    const devScore = calculateDevScore({
      tokens: allTokenScores,
      walletCount: wallets.length,
      accountCreatedAt: new Date(user.created_at),
    });

    // Update user score
    await updateUser(userId, {
      total_score: devScore.score,
      is_verified: wallets.length > 0,
    });

    // Record score history
    await addScoreHistory(userId, devScore.score, devScore.breakdown);

    return NextResponse.json({
      message: 'Sync complete',
      tokensFound: totalTokensFound,
      score: devScore.score,
      tier: devScore.tier,
      breakdown: devScore.breakdown,
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET method to check sync status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserById(session.user.id);
    const tokens = await getTokensForUserWallets(session.user.id);

    return NextResponse.json({
      lastSync: user?.updated_at,
      tokenCount: tokens.length,
      score: user?.total_score || 0,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
