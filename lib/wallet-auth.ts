/**
 * Wallet-first authentication system for DevKarma
 * Users authenticate by signing a message with their Solana wallet
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { getUserByWallet, createUserFromWallet } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production'
);

const SESSION_COOKIE_NAME = 'dk_session';
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

export interface WalletSessionPayload extends JWTPayload {
  userId: string;
  walletAddress: string;
}

/**
 * Create a JWT session token for a wallet-authenticated user
 */
export async function createSessionToken(userId: string, walletAddress: string): Promise<string> {
  const token = await new SignJWT({ userId, walletAddress })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySessionToken(token: string): Promise<WalletSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as WalletSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Set session cookie after successful wallet authentication
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  });
}

/**
 * Get session from cookie
 */
export async function getSessionFromCookie(): Promise<WalletSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Clear session cookie (logout)
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Get current user from session
 */
export async function getCurrentUser() {
  const session = await getSessionFromCookie();

  if (!session) {
    return null;
  }

  const user = await getUserByWallet(session.walletAddress);
  return user;
}

/**
 * Authenticate user by wallet - creates account if new
 * Returns session token on success
 */
export async function authenticateByWallet(walletAddress: string): Promise<{
  token: string;
  userId: string;
  isNewUser: boolean;
}> {
  // Check if user exists with this wallet
  let user = await getUserByWallet(walletAddress);
  let isNewUser = false;

  if (!user) {
    // Create new user with wallet as primary identity
    user = await createUserFromWallet(walletAddress);
    isNewUser = true;
  }

  // Create session token
  const token = await createSessionToken(user.id, walletAddress);

  return { token, userId: user.id, isNewUser };
}

/**
 * Generate Pump.fun profile URL for a wallet address
 */
// Re-export client-safe utilities
export { getPumpFunProfileUrl, getWalletDisplayName } from './wallet-utils';
