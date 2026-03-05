import { NextRequest } from 'next/server';
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
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { apiOk, apiRateLimited, apiNotFound, apiError, withCache } from '@/lib/api-response';
import { requireNextAuth } from '@/lib/api-auth';

export async function POST(_request: NextRequest) {
  try {
    // Require authentication
    const auth = await requireNextAuth();
    if (auth.error) return auth.error;

    // Rate limiting - sync is expensive (calls Helius API)
    const rateLimitId = getRateLimitIdentifier('user-sync', auth.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.userSync);
    if (!rateLimit.allowed) {
      return apiRateLimited(rateLimit, 'Sync limit reached. Please wait before syncing again.');
    }

    const user = await getUserById(auth.user.id);

    if (!user) {
      return apiNotFound('User');
    }

    const wallets = await getWalletsByUserId(auth.user.id);

    if (wallets.length === 0) {
      return apiOk({
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
        const scanResult = await scanWalletQuick(wallet.address);

        for (const token of scanResult.tokensCreated) {
          totalTokensFound++;

          await upsertToken({
            mint_address: token.mintAddress,
            name: token.name || 'Unknown',
            symbol: token.symbol || 'UNK',
            creator_wallet: wallet.address,
            user_id: auth.user.id,
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
    await updateUser(auth.user.id, {
      total_score: devScore.score,
      is_verified: wallets.length > 0,
    });

    // Record score history
    await addScoreHistory(auth.user.id, devScore.score, devScore.breakdown);

    return apiOk({
      message: 'Sync complete',
      tokensFound: totalTokensFound,
      score: devScore.score,
      tier: devScore.tier,
      breakdown: devScore.breakdown,
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    return apiError(error);
  }
}

// GET method to check sync status
export async function GET() {
  try {
    // Require authentication
    const auth = await requireNextAuth();
    if (auth.error) return auth.error;

    const user = await getUserById(auth.user.id);
    const tokens = await getTokensForUserWallets(auth.user.id);

    // Cache sync status for 30 seconds
    return withCache(
      apiOk({
        lastSync: user?.updated_at,
        tokenCount: tokens.length,
        score: user?.total_score || 0,
      }),
      30
    );
  } catch (error) {
    console.error('Error checking sync status:', error);
    return apiError(error);
  }
}
