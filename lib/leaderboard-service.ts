import { getLeaderboard as dbGetLeaderboard, getKolStatusForUsers, getKolsWithUsers } from './db';
import { getTierInfo, DevTier } from './scoring';

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

function scoresToTier(score: number): DevTier {
  if (score >= 700) return 'legend';
  if (score >= 600) return 'elite';
  if (score >= 500) return 'rising_star';
  if (score >= 450) return 'proven';
  if (score >= 300) return 'builder';
  if (score >= 150) return 'verified';
  if (score < 0) return 'penalized';
  return 'unverified';
}

export async function getLeaderboardData(limit: number = 50): Promise<LeaderboardEntry[]> {
  const users = await dbGetLeaderboard(limit);

  const userIds = users.map(u => u.id);
  const kolStatusMap = await getKolStatusForUsers(userIds);

  return users.map((user, index) => {
    const tier = scoresToTier(user.total_score);
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
      tier = scoresToTier(Number(kol.user_total_score));
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
