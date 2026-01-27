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
import { getAllTokensCreatedByWallet } from '@/lib/helius';
import { getTokenMarketData, checkMigrationStatus } from '@/lib/dexscreener';
import { calculateTokenScore, calculateDevScore } from '@/lib/scoring';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Fetch tokens for each wallet
    for (const wallet of wallets) {
      try {
        // Use combined detection (DAS API + transaction history)
        const tokensCreated = await getAllTokensCreatedByWallet(wallet.address);

        for (const tokenData of tokensCreated) {
          totalTokensFound++;

          // Get market data and migration status
          const marketData = await getTokenMarketData(tokenData.mintAddress).catch(() => null);
          const migrationStatus = await checkMigrationStatus(tokenData.mintAddress).catch(() => ({ 
            migrated: false, 
            migrationType: null, 
            pool: null, 
            liquidityUsd: 0, 
            migratedAt: null 
          }));

          // Use creation time from market data or fallback to 30 days ago
          const launchDate = marketData?.pairCreatedAt
            ? new Date(marketData.pairCreatedAt)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          // Calculate token score
          const scoreResult = await calculateTokenScore({
            mintAddress: tokenData.mintAddress,
            creatorWallet: wallet.address,
            launchDate,
            marketData,
            migrationStatus,
          });

          // Upsert token to database
          await upsertToken({
            mint_address: tokenData.mintAddress,
            name: tokenData.name || 'Unknown',
            symbol: tokenData.symbol || 'UNK',
            creator_wallet: wallet.address,
            user_id: userId,
            launch_date: launchDate.toISOString(),
            migrated: migrationStatus.migrated,
            migrated_at: migrationStatus.migrated ? new Date().toISOString() : null,
            current_market_cap: marketData?.marketCap,
            ath_market_cap: marketData?.marketCap, // We'd track this over time in production
            total_volume: marketData?.volume24h,
            score: scoreResult.score,
            status: 'active',
            metadata: {
              dex: migrationStatus.migrationType,
              pairAddress: marketData?.pairAddress,
            },
          });

          allTokenScores.push({
            score: scoreResult.score,
            migrated: migrationStatus.migrated,
            launchDate,
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
