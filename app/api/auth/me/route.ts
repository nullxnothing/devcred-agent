/**
 * Get current authenticated user
 * Returns user data if authenticated, null otherwise
 */

import { NextResponse } from 'next/server';
import { getCurrentUser, getSessionFromCookie, getPumpFunProfileUrl, getWalletDisplayName } from '@/lib/wallet-auth';

export async function GET() {
  try {
    const session = await getSessionFromCookie();

    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Return user data with wallet-first identity
    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.primary_wallet,
        walletDisplayName: user.primary_wallet ? getWalletDisplayName(user.primary_wallet) : null,
        pumpFunProfile: user.primary_wallet ? getPumpFunProfileUrl(user.primary_wallet) : null,
        pumpFunUsername: user.pumpfun_username || null,
        // Twitter data (optional - may be null)
        twitterHandle: user.twitter_handle || null,
        twitterName: user.twitter_name || null,
        avatarUrl: user.avatar_url || (user.primary_wallet
          ? `https://api.dicebear.com/7.x/identicon/svg?seed=${user.primary_wallet}`
          : null),
        // Score data
        totalScore: user.total_score,
        tier: user.tier,
        rank: user.rank,
        isVerified: user.is_verified,
      },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
