/**
 * Unified auth helpers for API routes
 * Returns consistent responses for authentication checks
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getSessionFromCookie, WalletSessionPayload } from './wallet-auth';
import { apiUnauthorized } from './api-response';

interface User {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

type AuthSuccess = { user: User; error?: never };
type AuthError = { user?: never; error: NextResponse };
type AuthResult = AuthSuccess | AuthError;

type WalletAuthSuccess = { session: WalletSessionPayload; error?: never };
type WalletAuthError = { session?: never; error: NextResponse };
type WalletAuthResult = WalletAuthSuccess | WalletAuthError;

type OptionalAuthResult = { session: WalletSessionPayload | null };

/**
 * Require NextAuth session (Twitter OAuth)
 * Returns user or error response
 */
export async function requireNextAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { error: apiUnauthorized('Please sign in with Twitter first.') };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
  };
}

/**
 * Require wallet-based auth session
 * Returns session payload or error response
 */
export async function requireWalletAuth(): Promise<WalletAuthResult> {
  const session = await getSessionFromCookie();

  if (!session) {
    return { error: apiUnauthorized('Please connect your wallet first.') };
  }

  return { session };
}

/**
 * Get optional wallet session (no error if missing)
 */
export async function optionalWalletAuth(): Promise<OptionalAuthResult> {
  const session = await getSessionFromCookie();
  return { session };
}

/**
 * Require either NextAuth or wallet auth
 * Returns user ID from whichever session is available
 */
export async function requireAnyAuth(): Promise<{ userId: string } | { error: NextResponse }> {
  // Try wallet auth first (preferred)
  const walletSession = await getSessionFromCookie();
  if (walletSession) {
    return { userId: walletSession.userId };
  }

  // Fall back to NextAuth
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { userId: session.user.id };
  }

  return { error: apiUnauthorized('Authentication required.') };
}
