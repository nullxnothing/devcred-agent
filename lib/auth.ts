/**
 * NextAuth.js configuration for DevCred
 * Twitter OAuth for developer authentication
 * Supports linking Twitter to existing wallet-based accounts
 */

import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { cookies } from 'next/headers';
import { jwtVerify, JWTPayload } from 'jose';
import { getUserByTwitterId, getUserById, createUser, updateUser } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

interface WalletSession extends JWTPayload {
  userId: string;
  walletAddress: string;
}

async function getWalletSession(): Promise<WalletSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('dk_session');
    if (!sessionCookie?.value) return null;

    const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
    return payload as WalletSession;
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      // Request username field from Twitter API v2
      userinfo: {
        url: 'https://api.twitter.com/2/users/me',
        params: {
          'user.fields': 'id,name,username,profile_image_url,description',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'twitter') {
        return false;
      }

      try {
        // Twitter OAuth 2.0 profile structure: username can be at profile.data.username or profile.username
        const twitterProfile = profile as { data?: { username?: string; name?: string }; username?: string };
        const twitterHandle = twitterProfile?.data?.username || twitterProfile?.username || '';
        const avatarUrl = user.image?.replace('_normal', '_400x400') || null;

        console.log('[DevCred Auth] Twitter handle:', twitterHandle);

        // Check if user is already logged in via wallet (linking flow)
        const walletSession = await getWalletSession();

        if (walletSession?.userId) {
          // LINKING FLOW: User is logged in with wallet, link Twitter to their account
          console.log('[DevCred Auth] Linking Twitter to wallet user:', walletSession.userId);

          const existingWalletUser = await getUserById(walletSession.userId);

          if (existingWalletUser) {
            // Check if this Twitter account is already linked to another user
            const existingTwitterUser = await getUserByTwitterId(account.providerAccountId);

            if (existingTwitterUser && existingTwitterUser.id !== existingWalletUser.id) {
              console.log('[DevCred Auth] Twitter already linked to different account');
              // Return error URL
              return `/profile/${existingWalletUser.primary_wallet}?twitter_error=${encodeURIComponent('This X account is already linked to another profile')}`;
            }

            // Link Twitter to existing wallet user
            await updateUser(existingWalletUser.id, {
              twitter_id: account.providerAccountId,
              twitter_handle: twitterHandle || null,
              twitter_name: user.name || null,
              avatar_url: avatarUrl,
            });

            console.log('[DevCred Auth] Twitter linked successfully');
            return true;
          }
        }

        // NORMAL FLOW: Twitter-first login
        const existingUser = await getUserByTwitterId(account.providerAccountId);

        if (existingUser) {
          // Update user info if changed
          await updateUser(existingUser.id, {
            twitter_handle: twitterHandle || existingUser.twitter_handle,
            twitter_name: user.name || existingUser.twitter_name,
            avatar_url: avatarUrl || existingUser.avatar_url,
          });
        } else {
          // Create new user
          await createUser({
            twitter_id: account.providerAccountId,
            twitter_handle: twitterHandle,
            twitter_name: user.name || '',
            avatar_url: avatarUrl,
          });
        }

        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Twitter OAuth 2.0: username can be at profile.data.username or profile.username
        const twitterProfile = profile as { data?: { username?: string }; username?: string };
        token.twitterId = account.providerAccountId;
        token.twitterHandle = twitterProfile?.data?.username || twitterProfile?.username;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.twitterId) {
        const dbUser = await getUserByTwitterId(token.twitterId as string);
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.twitterHandle = dbUser.twitter_handle ?? undefined;
          session.user.totalScore = dbUser.total_score;
          session.user.isVerified = dbUser.is_verified;
          session.user.rank = dbUser.rank;
        } else {
          // Fallback to JWT token data if DB user not found yet
          session.user.twitterHandle = token.twitterHandle as string;
        }
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Check if this is a Twitter linking callback
      if (url.includes('twitter-link/callback')) {
        // Get wallet session to redirect to their profile
        const walletSession = await getWalletSession();
        if (walletSession?.walletAddress) {
          return `${baseUrl}/profile/${walletSession.walletAddress}?twitter_linked=true`;
        }
      }

      // After sign in, redirect to the dashboard/profile
      if (url.startsWith(baseUrl)) {
        // If callback URL is just the base or root, redirect to dashboard
        if (url === baseUrl || url === `${baseUrl}/`) {
          return `${baseUrl}/dashboard`;
        }
        return url;
      }
      // Default to dashboard for relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/login',
    error: '/',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
