import { NextRequest, NextResponse } from 'next/server';
import { searchUsers, getWalletByAddress, getTokenByMint } from '@/lib/db';
import { PublicKey } from '@solana/web3.js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
    }

    const results: {
      users: Array<{
        id: string;
        twitterHandle: string;
        twitterName: string;
        avatarUrl: string | null;
        score: number;
        rank: number | null;
      }>;
      wallet: {
        address: string;
        userId: string | null;
        label: string | null;
      } | null;
      token: {
        mint: string;
        name: string;
        symbol: string;
        creatorWallet: string;
      } | null;
    } = {
      users: [],
      wallet: null,
      token: null,
    };

    // Check if query looks like a Solana address
    let isValidAddress = false;
    try {
      new PublicKey(query);
      isValidAddress = query.length >= 32 && query.length <= 44;
    } catch {
      isValidAddress = false;
    }

    if (isValidAddress) {
      // Search for wallet
      const wallet = await getWalletByAddress(query);
      if (wallet) {
        results.wallet = {
          address: wallet.address,
          userId: wallet.user_id,
          label: wallet.label,
        };
      } else {
        // If not in DB, suggest it as a new wallet to profile
        results.wallet = {
          address: query,
          userId: null,
          label: 'New Wallet (Not Profiled Yet)',
        };
      }

      // Search for token by mint
      const token = await getTokenByMint(query);
      if (token) {
        results.token = {
          mint: token.mint_address,
          name: token.name,
          symbol: token.symbol,
          creatorWallet: token.creator_wallet,
        };
      }
    }

    // Search users by handle/name
    const users = await searchUsers(query, 10);
    results.users = users.map((u) => ({
      id: u.id,
      twitterHandle: u.twitter_handle,
      twitterName: u.twitter_name,
      avatarUrl: u.avatar_url,
      score: u.total_score,
      rank: u.rank,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
