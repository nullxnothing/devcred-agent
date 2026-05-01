import { NextRequest } from 'next/server';
import { searchUsers, getWalletByAddress, getTokenByMint } from '@/lib/db';
import { PublicKey } from '@solana/web3.js';
import { apiOk, apiBadRequest, withCache } from '@/lib/api-response';

const EMPTY_RESULTS = {
  users: [],
  wallet: null,
  token: null,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim().replace(/^@/, '');

    if (!query || query.length < 2) {
      return apiBadRequest('Query must be at least 2 characters');
    }

    const results: {
      users: Array<{
        id: string;
        twitterHandle: string | null;
        twitterName: string | null;
        avatarUrl: string | null;
        primaryWallet?: string | null;
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
      const [wallet, token] = await Promise.all([
        getWalletByAddress(query),
        getTokenByMint(query),
      ]);

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
      if (token) {
        results.token = {
          mint: token.mint_address,
          name: token.name,
          symbol: token.symbol,
          creatorWallet: token.creator_wallet,
        };
      }
    } else if (query.length >= 3) {
      // Search users by handle/name. Avoid hammering the DB on very short typeahead queries.
      const users = await searchUsers(query, 10);
      results.users = users.map((u) => ({
        id: u.id,
        twitterHandle: u.twitter_handle,
        twitterName: u.twitter_name,
        avatarUrl: u.avatar_url,
        score: u.total_score,
        rank: u.rank,
      }));
    }

    // Cache search results for 30 seconds, stale for 60 more
    return withCache(apiOk(results), 30, 60);
  } catch (error) {
    console.error('Error searching:', error);
    return withCache(apiOk(EMPTY_RESULTS), 5, 30);
  }
}
