/**
 * NextAuth.js configuration for DevKarma
 * Twitter OAuth for developer authentication
 */

import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { getUserByTwitterId, createUser, updateUser } from './db';

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
        // Debug: Log the full profile object to see its structure
        console.log('[DevKarma Auth] Twitter profile received:', JSON.stringify(profile, null, 2));
        console.log('[DevKarma Auth] User object:', JSON.stringify(user, null, 2));

        // Twitter OAuth 2.0 profile structure: username can be at profile.data.username or profile.username
        const twitterProfile = profile as { data?: { username?: string; name?: string }; username?: string };
        const twitterHandle = twitterProfile?.data?.username || twitterProfile?.username || '';

        console.log('[DevKarma Auth] Extracted twitter handle:', twitterHandle);

        // Check if user exists
        const existingUser = await getUserByTwitterId(account.providerAccountId);

        if (existingUser) {
          // Update user info if changed
          await updateUser(existingUser.id, {
            twitter_handle: twitterHandle || existingUser.twitter_handle,
            twitter_name: user.name || existingUser.twitter_name,
            avatar_url: user.image || existingUser.avatar_url,
          });
        } else {
          // Create new user
          await createUser({
            twitter_id: account.providerAccountId,
            twitter_handle: twitterHandle,
            twitter_name: user.name || '',
            avatar_url: user.image || null,
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
          session.user.twitterHandle = dbUser.twitter_handle;
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
