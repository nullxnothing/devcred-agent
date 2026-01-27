import { NextRequest, NextResponse } from 'next/server';
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
import { calculateTokenScore, calculateDevScore, getTierInfo } from '@/lib/scoring';
import { getTokenMarketData, checkMigrationStatus } from '@/lib/dexscreener';
import { getTokensWithMigrationStatus } from '@/lib/helius';
import { PublicKey } from '@solana/web3.js';

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
        // This is a wallet search - get or create a system user
        user = await getOrCreateSystemUser(cleanHandle);
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const wallets = await getWalletsByUserId(user.id);
    let tokens = await getTokensForUserWallets(user.id);

    // If new system user (no tokens yet), trigger initial scan
    if (tokens.length === 0 && wallets.length > 0) {
      const primaryWallet = wallets.find(w => w.is_primary) || wallets[0];
      
      // Trigger optimized scan
      const scanResult = await getTokensWithMigrationStatus(primaryWallet.address);
      
      if (scanResult.tokens.length > 0) {
        // Upsert tokens to DB
        for (const tokenData of scanResult.tokens) {
          const migrationInfo = scanResult.migrated.get(tokenData.mintAddress);
          
          // Get market data for migrated tokens
          let marketData = null;
          if (migrationInfo) {
            marketData = await getTokenMarketData(tokenData.mintAddress).catch(() => null);
          }

          const migrationStatus = {
            migrated: !!migrationInfo,
            migrationType: migrationInfo ? 'DEX' : null,
            pool: null,
            liquidityUsd: marketData?.liquidity || 0,
            migratedAt: migrationInfo ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString() : null
          };

          await upsertToken({
            mint_address: tokenData.mintAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
            creator_wallet: primaryWallet.address,
            user_id: user.id,
            launch_date: marketData?.pairCreatedAt 
              ? new Date(marketData.pairCreatedAt).toISOString() 
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            migrated: migrationStatus.migrated,
            migrated_at: migrationStatus.migratedAt,
            current_market_cap: marketData?.marketCap,
            ath_market_cap: marketData?.marketCap, // Use current as ATH initially
            total_volume: marketData?.volume24h,
            status: 'active',
            score: migrationInfo ? 50 : 10, // Basic score
          });
        }
        
        // Refresh tokens list from DB after scan
        tokens = await getTokensForUserWallets(user.id);
      }
    }

    const tokenScores = await Promise.all(
      tokens.map(async (token) => {
        const marketData = await getTokenMarketData(token.mint_address).catch(() => null);
        const migrationStatus = await checkMigrationStatus(token.mint_address).catch(() => ({ 
          migrated: token.migrated, 
          migrationType: null, 
          pool: null, 
          liquidityUsd: 0, 
          migratedAt: token.migrated_at ? new Date(token.migrated_at) : null 
        }));

        const scoreResult = await calculateTokenScore({
          mintAddress: token.mint_address,
          creatorWallet: token.creator_wallet,
          launchDate: new Date(token.launch_date),
          isRugged: token.status === 'rug',
          marketData,
          migrationStatus,
        });

        return {
          mint: token.mint_address,
          name: token.name,
          symbol: token.symbol,
          launchDate: token.launch_date,
          migrated: migrationStatus.migrated,
          marketCap: marketData?.marketCap || token.current_market_cap,
          volume24h: marketData?.volume24h,
          status: token.status,
          score: scoreResult.score,
          breakdown: scoreResult.breakdown,
        };
      })
    );

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

    return NextResponse.json({
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
      },
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
