import { getLeaderboard as dbGetLeaderboard, getUserByTwitterHandle, getOrCreateSystemUser, getWalletsByUserId, getTokensForUserWallets, updateUser, addScoreHistory, recordProfileView, upsertToken } from './db';
import { getTierInfo, DevTier, calculateDevScore, calculateTokenScore } from './scoring';
import { getTokenMarketData, checkMigrationStatus } from './dexscreener';
import { getTokensWithMigrationStatus } from './helius';
import { PublicKey } from '@solana/web3.js';

export interface LeaderboardEntry {
  rank: number;
  id: string;
  twitterHandle: string;
  twitterName: string;
  avatarUrl: string | null;
  score: number;
  tier: string;
  tierName: string;
  tierColor: string;
  isVerified: boolean;
}

export async function getLeaderboardData(limit: number = 50) {
  const users = await dbGetLeaderboard(limit);

  return users.map((user, index) => {
    // Determine tier based on score thresholds
    let tier: DevTier = 'unverified';
    if (user.total_score >= 720) tier = 'legend';
    else if (user.total_score >= 700) tier = 'elite';
    else if (user.total_score >= 500) tier = 'proven';
    else if (user.total_score >= 200) tier = 'builder';
    else if (user.total_score > 0) tier = 'verified';

    const tierInfo = getTierInfo(tier);

    return {
      rank: user.rank || index + 1,
      id: user.id,
      twitterHandle: user.twitter_handle,
      twitterName: user.twitter_name,
      avatarUrl: user.avatar_url,
      score: user.total_score,
      tier: tier,
      tierName: tierInfo.name,
      tierColor: tierInfo.color,
      isVerified: user.is_verified,
    };
  });
}

export interface ProfileData {
  user: {
    id: string;
    twitterHandle: string;
    twitterName: string;
    avatarUrl: string | null;
    bio: string | null;
    isVerified: boolean;
    rank: number | null;
    createdAt: string;
  };
  score: {
    total: number;
    tier: string;
    tierName: string;
    tierColor: string;
    breakdown: {
      tokenCount: number;
      migrationCount: number;
      averageTokenScore: number;
      weightedScore: number;
      accountAgeMonths: number;
    };
  };
  wallets: Array<{
    address: string;
    label: string | null;
    isPrimary: boolean;
  }>;
  tokens: Array<{
    mint: string;
    name: string;
    symbol: string;
    launchDate: string;
    migrated: boolean;
    marketCap: number | null;
    volume24h: number | null;
    status: string;
    score: number;
  }>;
  stats: {
    totalTokens: number;
    migratedTokens: number;
    avgTokenScore: number;
  };
}

export async function getProfileData(handle: string, viewerIp?: string): Promise<ProfileData | null> {
  try {
    const cleanHandle = handle.replace(/^@/, '');

    // First try Twitter handle lookup
    let user = await getUserByTwitterHandle(cleanHandle);

    // If not found, check if it's a valid Solana wallet address
    if (!user) {
      let isValidAddress = false;
      try {
        new PublicKey(cleanHandle);
        isValidAddress = cleanHandle.length >= 32 && cleanHandle.length <= 44;
      } catch {
        isValidAddress = false;
      }

      if (isValidAddress) {
        // Create/get system user for unclaimed wallet
        user = await getOrCreateSystemUser(cleanHandle);
      }
    }

    if (!user) {
      return null;
    }

    const wallets = await getWalletsByUserId(user.id);
    let tokens = await getTokensForUserWallets(user.id);

    // If new system user (no tokens yet), trigger initial wallet scan
    if (tokens.length === 0 && wallets.length > 0) {
      const primaryWallet = wallets.find(w => w.is_primary) || wallets[0];

      // Scan wallet for tokens using Helius
      const scanResult = await getTokensWithMigrationStatus(primaryWallet.address);

      if (scanResult.tokens.length > 0) {
        // Upsert discovered tokens to DB
        for (const tokenData of scanResult.tokens) {
          const migrationInfo = scanResult.migrated.get(tokenData.mintAddress);

          // Get market data for migrated tokens
          let marketData = null;
          if (migrationInfo) {
            marketData = await getTokenMarketData(tokenData.mintAddress).catch(() => null);
          }

          await upsertToken({
            mint_address: tokenData.mintAddress,
            name: tokenData.name,
            symbol: tokenData.symbol,
            creator_wallet: primaryWallet.address,
            user_id: user.id,
            launch_date: marketData?.pairCreatedAt
              ? new Date(marketData.pairCreatedAt).toISOString()
              : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            migrated: !!migrationInfo,
            migrated_at: migrationInfo ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString() : undefined,
            current_market_cap: marketData?.marketCap,
            ath_market_cap: marketData?.marketCap,
            total_volume: marketData?.volume24h,
            status: 'active',
            score: migrationInfo ? 50 : 10,
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
          migratedAt: token.migrated_at ? new Date(token.migrated_at) : null,
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
          volume24h: marketData?.volume24h || null,
          status: token.status,
          score: scoreResult.score,
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

    const tierInfo = getTierInfo(devScore.tier);

    // Record profile view
    if (viewerIp) {
      recordProfileView(user.id, viewerIp).catch(() => {});
    }

    return {
      user: {
        id: user.id,
        twitterHandle: user.twitter_handle,
        twitterName: user.twitter_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        isVerified: user.is_verified,
        rank: user.rank,
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
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}
