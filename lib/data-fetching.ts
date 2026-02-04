import { getLeaderboard as dbGetLeaderboard, getUserByTwitterHandle, getOrCreateSystemUser, getWalletsByUserId, getTokensForUserWallets, updateUser, addScoreHistory, recordProfileView, upsertToken, updateUserRank, getKolByUserId, getKolStatusForUsers, getKolsWithUsers, getAllKols } from './db';
import { getTierInfo, DevTier, calculateDevScore, calculateTokenScoresBatch, TokenScoreInput } from './scoring';
import type { Kol } from '@/types/database';
import { getMultipleTokensMarketData } from './dexscreener';
import { detectRugPattern, getMigratedTokensFromSwapHistory, batchGetHolderCountsQuick } from './helius';
import { getCachedHolderCount, setCachedHolderCount, invalidateWalletCache as invalidateDbWalletCache } from './cache';
import { invalidateWalletCache as invalidateTxCache } from './helius';
import { detectTokensCreatedByWallet } from './token-detection';
import { PublicKey } from '@solana/web3.js';
import {
  mapTokenToDisplayData,
  mapTokenWithMarketData,
  deriveMigrationStatus,
  getPrimaryWallet,
  isValidSolanaAddress,
  cleanTwitterHandle,
  DEFAULT_RUG_DETECTION,
  safeRugDetection,
  TokenDisplayData,
} from './profile-service';
import { DEX_CONFIG } from './constants';
import { User, Token } from '@/types/database';

// ==================== USER RESOLUTION ====================

/** Resolve user from Twitter handle or wallet address */
async function resolveUserFromHandle(handle: string): Promise<User | null> {
  const cleanHandle = cleanTwitterHandle(handle);

  // Try Twitter handle first
  let user = await getUserByTwitterHandle(cleanHandle);
  if (user) return user;

  // Check if it's a valid Solana address
  try {
    new PublicKey(cleanHandle);
    if (isValidSolanaAddress(cleanHandle)) {
      return await getOrCreateSystemUser(cleanHandle);
    }
  } catch {
    // Not a valid address
  }

  return null;
}

// ==================== TOKEN SCANNING ====================

/** Scan wallet for tokens and save to DB */
async function scanAndSaveTokens(
  walletAddress: string,
  userId: string
): Promise<Token[]> {
  try {
    const scanResult = await detectTokensCreatedByWallet(walletAddress);
    if (scanResult.tokens.length === 0) return [];

    let migratedTokens = new Map<string, { firstSwapTimestamp: number }>();
    try {
      const tokenMints = new Set(scanResult.tokens.map(t => t.mintAddress));
      migratedTokens = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);
    } catch (migrationError) {
      console.error('[scanAndSaveTokens] Migration check failed:', migrationError);
    }

    const results = await Promise.allSettled(
      scanResult.tokens.map(async (tokenData) => {
        const migrationInfo = migratedTokens.get(tokenData.mintAddress);

        const rugDetection = await safeRugDetection(
          () => detectRugPattern(walletAddress, tokenData.mintAddress, tokenData.creationTimestamp),
          DEFAULT_RUG_DETECTION
        );

        return upsertToken({
          mint_address: tokenData.mintAddress,
          name: tokenData.name,
          symbol: tokenData.symbol,
          creator_wallet: walletAddress,
          user_id: userId,
          launch_date: tokenData.creationTimestamp
            ? new Date(tokenData.creationTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          migrated: !!migrationInfo,
          migrated_at: migrationInfo
            ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString()
            : undefined,
          status: rugDetection.isRug ? 'rug' : 'active',
          score: migrationInfo ? 50 : (rugDetection.isRug ? 0 : 10),
          metadata: {
            creation_signature: tokenData.creationSignature,
            creation_verified: tokenData.confidence === 'high',
            creation_method: tokenData.creationMethod,
            rug_severity: rugDetection.severity,
            dev_sell_percent: rugDetection.sellPercent,
          },
        });
      })
    );

    const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.length > 0) {
      console.error(`[scanAndSaveTokens] ${failures.length}/${results.length} token saves failed:`,
        failures.map(f => f.reason?.message || f.reason).join(', '));
    }

    // Invalidate caches after successful scan to ensure fresh data on next request
    await invalidateDbWalletCache(walletAddress).catch(() => {});
    invalidateTxCache(walletAddress);

    return await getTokensForUserWallets(userId);
  } catch (error) {
    console.error('[scanAndSaveTokens] Fatal error:', error);
    return [];
  }
}

// ==================== TOKEN ENRICHMENT ====================

/** Enrich tokens with market data and calculate scores */
async function enrichTokensWithMarketData(
  tokens: Token[]
): Promise<TokenDisplayData[]> {
  const mintAddresses = tokens.map(t => t.mint_address);

  // Check cache for holder counts first
  const cachedCounts = new Map<string, number>();
  const uncachedMints: string[] = [];

  for (const mint of mintAddresses) {
    const cached = getCachedHolderCount(mint);
    if (cached !== null) {
      cachedCounts.set(mint, cached);
    } else {
      uncachedMints.push(mint);
    }
  }

  // Fetch market data and uncached holder counts in parallel
  const [marketDataMap, freshHolderCounts] = await Promise.all([
    getMultipleTokensMarketData(mintAddresses),
    uncachedMints.length > 0 ? batchGetHolderCountsQuick(uncachedMints) : new Map<string, number>(),
  ]);

  // Cache fresh holder counts and merge with cached
  const holderCountsMap = new Map<string, number>(cachedCounts);
  for (const [mint, count] of freshHolderCounts) {
    setCachedHolderCount(mint, count);
    holderCountsMap.set(mint, count);
  }

  const scoreInputs: TokenScoreInput[] = tokens.map((token) => {
    const marketData = marketDataMap.get(token.mint_address) || null;
    const holderCount = holderCountsMap.get(token.mint_address) || 0;
    const metadata = token.metadata as { rug_severity?: 'soft' | 'hard' | null } | null;

    return {
      mintAddress: token.mint_address,
      creatorWallet: token.creator_wallet,
      launchDate: new Date(token.launch_date),
      isRugged: token.status === 'rug',
      rugSeverity: metadata?.rug_severity,
      holderCount,
      marketData,
      migrationStatus: deriveMigrationStatus(token, marketData),
    };
  });

  const scoreResults = await calculateTokenScoresBatch(scoreInputs);

  return tokens.map((token) => {
    const marketData = marketDataMap.get(token.mint_address) || null;
    const scoreResult = scoreResults.find(r => r.mintAddress === token.mint_address);
    return mapTokenWithMarketData(token, marketData, scoreResult?.score || token.score || 10);
  });
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  twitterHandle: string | null;
  twitterName: string | null;
  avatarUrl: string | null;
  primaryWallet?: string | null;
  score: number;
  tier: string;
  tierName: string;
  tierColor: string;
  isVerified: boolean;
  isKol: boolean;
}

export async function getLeaderboardData(limit: number = 50) {
  const users = await dbGetLeaderboard(limit);

  // Get KOL status for all users in one query
  const userIds = users.map(u => u.id);
  const kolStatusMap = await getKolStatusForUsers(userIds);

  return users.map((user, index) => {
    // Always calculate tier based on score to ensure consistency
    let tier: DevTier = 'unverified';

    if (user.total_score >= 700) tier = 'legend';
    else if (user.total_score >= 600) tier = 'elite';
    else if (user.total_score >= 500) tier = 'rising_star';
    else if (user.total_score >= 450) tier = 'proven';
    else if (user.total_score >= 300) tier = 'builder';
    else if (user.total_score >= 150) tier = 'verified';
    else if (user.total_score < 0) tier = 'penalized';

    const tierInfo = getTierInfo(tier);

    return {
      rank: user.rank || index + 1,
      id: user.id,
      twitterHandle: user.twitter_handle,
      twitterName: user.twitter_name,
      avatarUrl: user.avatar_url,
      primaryWallet: user.primary_wallet,
      score: user.total_score,
      tier: tier,
      tierName: tierInfo.name,
      tierColor: tierInfo.color,
      isVerified: user.is_verified,
      isKol: kolStatusMap.get(user.id) || false,
    };
  });
}

export interface ProfileData {
  user: {
    id: string;
    twitterHandle: string | null;
    twitterName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    isVerified: boolean;
    isKol: boolean;
    rank: number | null;
    primaryWallet?: string | null;
    createdAt: string;
  };
  kol: {
    name: string;
    twitterUrl: string | null;
    telegramUrl: string | null;
    kolscanRank: number | null;
    pnlSol: number | null;
    wins: number;
    losses: number;
  } | null;
  score: {
    total: number;
    tier: string;
    tierName: string;
    tierColor: string;
    breakdown: {
      baseScore: number;
      tokenCount: number;
      migrationCount: number;
      migrationBonus: number;
      marketCapBonus: number;
      tokenScoreBonus: number;
      rugPenalties: number;
      rugCount: number;
      hardRugCount: number;
      accountAgeMonths: number;
      averageTokenScore: number;
    };
  };
  wallets: Array<{
    id: string;
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
    totalVolume: number | null;
    athMarketCap?: number | null;
    status: string;
    score: number;
    rugSeverity?: 'soft' | 'hard' | null;
    creationVerified?: boolean;
  }>;
  stats: {
    totalTokens: number;
    migratedTokens: number;
    avgTokenScore: number;
    rugCount: number;
  };
}

export async function getProfileData(handle: string, viewerIp?: string, forceRefresh = false): Promise<ProfileData | null> {
  try {
    // Step 1: Resolve user from handle or wallet address
    const user = await resolveUserFromHandle(handle);
    if (!user) return null;

    // Step 2: Get wallets and existing tokens
    const wallets = await getWalletsByUserId(user.id);
    let tokens = await getTokensForUserWallets(user.id);

    // Step 3: Check if we have a recent Axiom scrape (within 24h)
    // If so, trust the cached score from extension instead of recalculating
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
    const userWithScrape = user as typeof user & { scraped_at?: string | null };
    const hasRecentScrape = userWithScrape.scraped_at &&
      (Date.now() - new Date(userWithScrape.scraped_at).getTime()) < CACHE_TTL;

    if (hasRecentScrape && user.total_score > 0 && !forceRefresh) {
      // Use cached Axiom score - skip recalculation
      const cachedTier = (user.tier as DevTier) || 'unverified';
      const tierInfo = getTierInfo(cachedTier);
      const kol = await getKolByUserId(user.id);

      if (viewerIp) {
        recordProfileView(user.id, viewerIp).catch(() => {});
      }

      // Still get tokens for display, but don't recalculate score
      const tokenScores: TokenDisplayData[] = tokens.map(mapTokenToDisplayData);
      const migratedCount = tokenScores.filter(t => t.migrated).length;
      const rugCount = tokenScores.filter(t => t.status === 'rug').length;
      const avgScore = tokenScores.length > 0
        ? tokenScores.reduce((sum, t) => sum + t.score, 0) / tokenScores.length
        : 0;

      return {
        user: {
          id: user.id,
          twitterHandle: user.twitter_handle,
          twitterName: user.twitter_name,
          avatarUrl: user.avatar_url,
          bio: user.bio,
          isVerified: user.is_verified,
          isKol: !!kol,
          rank: user.rank,
          createdAt: user.created_at,
        },
        kol: kol ? {
          name: kol.name,
          twitterUrl: kol.twitter_url,
          telegramUrl: kol.telegram_url,
          kolscanRank: kol.kolscan_rank,
          pnlSol: kol.pnl_sol ? Number(kol.pnl_sol) : null,
          wins: kol.wins,
          losses: kol.losses,
        } : null,
        score: {
          total: user.total_score,
          tier: cachedTier,
          tierName: tierInfo.name,
          tierColor: tierInfo.color,
          breakdown: {
            baseScore: 500,
            tokenCount: tokenScores.length,
            migrationCount: migratedCount,
            migrationBonus: 0,
            marketCapBonus: 0,
            tokenScoreBonus: 0,
            rugPenalties: 0,
            rugCount,
            hardRugCount: 0,
            accountAgeMonths: 0,
            averageTokenScore: avgScore,
          },
        },
        wallets: wallets.map((w) => ({
          id: w.id,
          address: w.address,
          label: w.label,
          isPrimary: w.is_primary,
        })),
        tokens: tokenScores.map(t => ({
          mint: t.mint,
          name: t.name,
          symbol: t.symbol,
          launchDate: t.launchDate,
          migrated: t.migrated,
          marketCap: t.marketCap,
          volume24h: t.volume24h,
          totalVolume: t.totalVolume,
          athMarketCap: t.athMarketCap,
          status: t.status,
          score: t.score,
          rugSeverity: t.rugSeverity,
          creationVerified: t.creationVerified,
        })),
        stats: {
          totalTokens: tokenScores.length,
          migratedTokens: migratedCount,
          avgTokenScore: avgScore,
          rugCount,
        },
      };
    }

    // No recent scrape - calculate from token data (existing logic)

    // Step 4: Scan for new tokens if needed
    if (tokens.length === 0 && wallets.length > 0) {
      const primaryWallet = getPrimaryWallet(wallets);
      if (primaryWallet) {
        tokens = await scanAndSaveTokens(primaryWallet.address, user.id);
      }
    }

    // Step 5: Calculate token scores
    // Use cached DB data by default (FAST) - only fetch live market data if explicitly requested
    const tokenScores: TokenDisplayData[] = forceRefresh
      ? await enrichTokensWithMarketData(tokens)
      : tokens.map(mapTokenToDisplayData);

    // Calculate dev score with the new base-500 system
    const devScore = calculateDevScore({
      tokens: tokenScores.map((t) => ({
        score: t.score,
        migrated: t.migrated,
        launchDate: new Date(t.launchDate),
        athMarketCap: t.athMarketCap || undefined,
        status: t.status as 'active' | 'inactive' | 'rug',
        rugSeverity: t.rugSeverity,
      })),
      walletCount: wallets.length,
      accountCreatedAt: new Date(user.created_at),
    });

    // Update user's total score and rank in DB
    await updateUser(user.id, { total_score: devScore.score, tier: devScore.tier });
    await addScoreHistory(user.id, devScore.score, devScore.breakdown).catch(() => {});

    // Update just this user's rank (non-blocking) - avoids full table scan
    updateUserRank(user.id).catch(() => {});

    const tierInfo = getTierInfo(devScore.tier);

    // Check if user is a KOL
    const kol = await getKolByUserId(user.id);

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
        isKol: !!kol,
        rank: user.rank,
        createdAt: user.created_at,
      },
      kol: kol ? {
        name: kol.name,
        twitterUrl: kol.twitter_url,
        telegramUrl: kol.telegram_url,
        kolscanRank: kol.kolscan_rank,
        pnlSol: kol.pnl_sol ? Number(kol.pnl_sol) : null,
        wins: kol.wins,
        losses: kol.losses,
      } : null,
      score: {
        total: devScore.score,
        tier: devScore.tier,
        tierName: tierInfo.name,
        tierColor: tierInfo.color,
        breakdown: devScore.breakdown,
      },
      wallets: wallets.map((w) => ({
        id: w.id,
        address: w.address,
        label: w.label,
        isPrimary: w.is_primary,
      })),
      tokens: tokenScores.map(t => ({
        mint: t.mint,
        name: t.name,
        symbol: t.symbol,
        launchDate: t.launchDate,
        migrated: t.migrated,
        marketCap: t.marketCap,
        volume24h: t.volume24h,
        totalVolume: t.totalVolume,
        athMarketCap: t.athMarketCap,
        status: t.status,
        score: t.score,
        rugSeverity: t.rugSeverity,
        creationVerified: t.creationVerified,
      })),
      stats: {
        totalTokens: tokens.length,
        migratedTokens: devScore.breakdown.migrationCount,
        avgTokenScore: devScore.breakdown.averageTokenScore,
        rugCount: devScore.breakdown.rugCount,
      },
    };
  } catch (error) {
    console.error('Error fetching profile data:', error);
    return null;
  }
}

// KOL Leaderboard Types
export interface KolLeaderboardEntry {
  id: string;
  walletAddress: string;
  name: string;
  twitterUrl: string | null;
  telegramUrl: string | null;
  kolscanRank: number | null;
  pnlSol: number | null;
  wins: number;
  losses: number;
  isClaimed: boolean;
  user: {
    id: string;
    twitterHandle: string | null;
    twitterName: string | null;
    avatarUrl: string | null;
    primaryWallet?: string | null;
    score: number;
    rank: number | null;
    tier: string;
    tierName: string;
    tierColor: string;
    isVerified: boolean;
  } | null;
}

export async function getKolLeaderboardData(limit: number = 50): Promise<KolLeaderboardEntry[]> {
  const kols = await getKolsWithUsers(limit);

  return kols.map((kol) => {
    let tier: DevTier = 'unverified';
    let tierInfo = getTierInfo(tier);

    if (kol.user_total_score !== undefined && kol.user_total_score !== null) {
      const score = Number(kol.user_total_score);
      if (score >= 700) tier = 'legend';
      else if (score >= 600) tier = 'elite';
      else if (score >= 500) tier = 'rising_star';
      else if (score >= 450) tier = 'proven';
      else if (score >= 300) tier = 'builder';
      else if (score >= 150) tier = 'verified';
      else if (score < 0) tier = 'penalized';
      tierInfo = getTierInfo(tier);
    }

    const hasUser = kol.user_id && kol.user_twitter_handle;

    return {
      id: kol.id,
      walletAddress: kol.wallet_address,
      name: kol.name,
      twitterUrl: kol.twitter_url,
      telegramUrl: kol.telegram_url,
      kolscanRank: kol.kolscan_rank,
      pnlSol: kol.pnl_sol ? Number(kol.pnl_sol) : null,
      wins: kol.wins,
      losses: kol.losses,
      isClaimed: !!hasUser,
      user: hasUser ? {
        id: kol.user_id!,
        twitterHandle: kol.user_twitter_handle!,
        twitterName: kol.user_twitter_name!,
        avatarUrl: kol.user_avatar_url || null,
        score: Number(kol.user_total_score) || 0,
        rank: kol.user_rank || null,
        tier,
        tierName: tierInfo.name,
        tierColor: tierInfo.color,
        isVerified: kol.user_is_verified || false,
      } : null,
    };
  });
}
