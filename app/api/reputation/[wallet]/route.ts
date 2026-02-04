/**
 * Pre-computed Reputation API
 *
 * GET /api/reputation/:wallet
 *
 * Returns the pre-computed reputation score for a wallet.
 * Supports multi-wallet identity linking: if the wallet is linked to a user,
 * returns the unified score across all linked wallets.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByAnyWallet, getTokensForUserWallets, getWalletsByUserId } from '@/lib/db';
import { scanWalletQuick } from '@/lib/wallet-scan';
import { isValidSolanaAddress } from '@/lib/validation/solana';

interface ReputationResponse {
  wallet: string;
  score: number;
  tier: string;
  tierName: string;
  tokenCount: number;
  rugCount: number;
  migrationCount: number;
  lastScanned: string | null;
  source: 'cached' | 'scraped' | 'fresh';
  userId?: string;
  linkedWallets?: string[];
  isLinkedWallet?: boolean;
  // Twitter profile info (if connected)
  twitterHandle?: string | null;
  twitterName?: string | null;
  avatarUrl?: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
): Promise<NextResponse> {
  const { wallet } = await params;

  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: 'Invalid Solana wallet address' },
      { status: 400 }
    );
  }

  try {
    // Two-hop lookup: check primary_wallet, then dk_wallets
    const user = await getUserByAnyWallet(wallet);

    if (user && (user.total_score ?? 0) > 0) {
      // Parallel fetch: tokens and wallets
      const [tokens, wallets] = await Promise.all([
        getTokensForUserWallets(user.id),
        getWalletsByUserId(user.id),
      ]);

      // Use scraped data from dk_users if dk_tokens is empty
      // This happens when extension updates score but full scan hasn't run
      const hasTokenData = tokens.length > 0;
      const tokenCount = hasTokenData ? tokens.length : (user.token_count || 0);
      const rugCount = hasTokenData ? tokens.filter(t => t.status === 'rug').length : (user.rug_count || 0);
      const migrationCount = hasTokenData ? tokens.filter(t => t.migrated).length : (user.migration_count || 0);

      const linkedWallets = wallets.map(w => w.address);
      const isLinkedWallet = user.primary_wallet !== wallet;

      // Only include Twitter info if it's a real Twitter account (has twitter_id)
      // System-generated handles like "dev_XXXXXXXX" should not be returned
      const hasRealTwitter = user.twitter_id && user.twitter_handle && !user.twitter_handle.startsWith('dev_');

      const response: ReputationResponse = {
        wallet,
        score: user.total_score,
        tier: user.tier || 'unverified',
        tierName: getTierName(user.tier || 'unverified'),
        tokenCount,
        rugCount,
        migrationCount,
        lastScanned: user.updated_at,
        source: hasTokenData ? 'cached' : 'scraped',
        userId: user.id,
        linkedWallets: linkedWallets.length > 1 ? linkedWallets : undefined,
        isLinkedWallet: isLinkedWallet || undefined,
        // Only include Twitter info if user has linked a real Twitter account
        twitterHandle: hasRealTwitter ? user.twitter_handle : undefined,
        twitterName: hasRealTwitter ? user.twitter_name : undefined,
        avatarUrl: hasRealTwitter ? user.avatar_url : undefined,
      };

      // Cache for 5 minutes on CDN, allow stale for 10 min while revalidating
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // No cached data, perform fresh scan
    const result = await scanWalletQuick(wallet);

    const response: ReputationResponse = {
      wallet,
      score: result.totalScore,
      tier: result.tier,
      tierName: result.tierName,
      tokenCount: result.breakdown.tokenCount,
      rugCount: result.breakdown.rugCount,
      migrationCount: result.breakdown.migrationCount,
      lastScanned: new Date().toISOString(),
      source: 'fresh',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reputation API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation' },
      { status: 500 }
    );
  }
}

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    legend: 'Legend',
    elite: 'Elite',
    rising_star: 'Rising Star',
    proven: 'Proven',
    builder: 'Builder',
    verified: 'Verified',
    penalized: 'Penalized',
    unverified: 'Unverified',
  };
  return names[tier] || 'Unknown';
}
