import { NextRequest } from 'next/server';
import {
  getUserByTwitterHandle,
  getWalletsByUserId,
  getTokensForUserWallets,
  recordProfileView,
  getOrCreateSystemUser,
  upsertToken,
  addScoreHistory,
  updateUser,
  updateUserRank
} from '@/lib/db';
import { calculateDevScore, getTierInfo } from '@/lib/scoring';
import { scanWalletQuick, MAX_AUTO_SCAN_TOKENS } from '@/lib/wallet-scan';
import { PublicKey } from '@solana/web3.js';
import { apiOk, apiNotFound, apiError, withCache } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  try {
    const { handle } = await params;
    const decodedHandle = decodeURIComponent(handle);
    const cleanHandle = decodedHandle.replace(/^@/, '');

    let user = await getUserByTwitterHandle(cleanHandle);

    // If not found by twitter handle, check if it's a wallet address
    if (!user) {
      let isValidAddress = false;
      try {
        new PublicKey(cleanHandle);
        isValidAddress = cleanHandle.length >= 32 && cleanHandle.length <= 44;
      } catch {
        isValidAddress = false;
      }

      if (isValidAddress) {
        // Look up existing user only — don't auto-create from unauthenticated requests
        const { getUserByAnyWallet } = await import('@/lib/db');
        user = await getUserByAnyWallet(cleanHandle);
        if (!user) {
          return apiNotFound('User', cleanHandle);
        }
      }
    }

    if (!user) {
      return apiNotFound('User', cleanHandle);
    }

    const wallets = await getWalletsByUserId(user.id);
    let tokens = await getTokensForUserWallets(user.id);

    // Track scan limits across all wallets
    let totalTokensFound = 0;
    let tokensLimited = false;

    // If no tokens yet, trigger fast scan for all wallets
    if (tokens.length === 0 && wallets.length > 0) {
      for (const wallet of wallets) {
        try {
          // Use optimized batch scan
          const scanResult = await scanWalletQuick(wallet.address);
          totalTokensFound += scanResult.totalTokensFound;
          if (scanResult.tokensLimited) tokensLimited = true;

          // Save tokens to DB
          for (const token of scanResult.tokensCreated) {
            await upsertToken({
              mint_address: token.mintAddress,
              name: token.name,
              symbol: token.symbol,
              creator_wallet: wallet.address,
              user_id: user.id,
              launch_date: new Date(token.launchedAt * 1000).toISOString(),
              migrated: token.migrated,
              migrated_at: token.migrated ? new Date().toISOString() : null,
              current_market_cap: token.marketCap ? Math.round(token.marketCap) : null,
              ath_market_cap: token.marketCap ? Math.round(token.marketCap) : null,
              total_volume: null,
              status: token.isRugged ? 'rug' : 'active',
              score: token.score.total,
              metadata: {
                holders: token.currentHolders,
                dev_holding_percent: token.devHoldingPercent,
              },
            });
          }
        } catch (walletError) {
          console.error(`Error scanning wallet ${wallet.address}:`, walletError);
        }
      }

      // Refresh tokens list from DB after scan
      tokens = await getTokensForUserWallets(user.id);
    }

    // Map DB tokens to response format (use stored scores, no extra API calls)
    const tokenScores = tokens.map((token) => {
      const metadata = token.metadata as { score_breakdown?: object } | null;
      return {
        mint: token.mint_address,
        name: token.name,
        symbol: token.symbol,
        launchDate: token.launch_date,
        migrated: token.migrated,
        marketCap: token.current_market_cap,
        volume24h: token.total_volume,
        status: token.status,
        score: token.score || 0,
        breakdown: metadata?.score_breakdown || {},
      };
    });

    const devScore = calculateDevScore({
      tokens: tokenScores.map((t) => ({
        score: t.score,
        migrated: t.migrated,
        launchDate: new Date(t.launchDate),
      })),
      walletCount: wallets.length,
      accountCreatedAt: new Date(user.created_at),
    });

    // Update user's total score in DB
    await updateUser(user.id, { total_score: devScore.score });
    await addScoreHistory(user.id, devScore.score, devScore.breakdown).catch(() => {});
    
    // Update user's rank on the leaderboard
    const newRank = await updateUserRank(user.id).catch(() => null);

    const tierInfo = getTierInfo(devScore.tier);

    const viewerIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    recordProfileView(user.id, viewerIp || undefined).catch(() => {});

    // Cache profile data for 60 seconds, stale for 120 more
    return withCache(
      apiOk({
        user: {
          id: user.id,
          twitterHandle: user.twitter_handle,
          twitterName: user.twitter_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          isVerified: user.is_verified,
          rank: newRank ?? user.rank,
          createdAt: user.created_at,
        },
        score: {
          total: devScore.score,
          tier: devScore.tier,
          tierName: tierInfo.name,
          tierColor: tierInfo.color,
          breakdown: devScore.breakdown,
        },
        wallets: wallets.map((w) => ({
          address: w.address,
          label: w.label,
          isPrimary: w.is_primary,
        })),
        tokens: tokenScores,
        stats: {
          totalTokens: tokens.length,
          migratedTokens: devScore.breakdown.migrationCount,
          avgTokenScore: devScore.breakdown.averageTokenScore,
          totalTokensFound: totalTokensFound || tokens.length,
          tokensLimited,
          maxAutoScanTokens: MAX_AUTO_SCAN_TOKENS,
        },
      }),
      60,
      120
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return apiError(error);
  }
}
