/**
 * Verify wallet signature and create/return session
 * This is the main authentication endpoint for wallet-first auth
 */

import { NextRequest } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { consumeNonce, createSignMessage } from '@/lib/nonce-store';
import { authenticateByWallet, setSessionCookie, getPumpFunProfileUrl } from '@/lib/wallet-auth';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { apiOk, apiRateLimited, apiBadRequest, apiError } from '@/lib/api-response';
import { validateBody, getClientIp } from '@/lib/api-validation';
import { walletVerifyRequestSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(request, walletVerifyRequestSchema);
    if (validation.error) return validation.error;
    const { walletAddress, signature } = validation.data;

    // Validate wallet address is a valid Solana public key
    try {
      new PublicKey(walletAddress);
    } catch {
      return apiBadRequest('Invalid wallet address format');
    }

    // Rate limiting by IP + wallet
    const ip = getClientIp(request);
    const rateLimitId = getRateLimitIdentifier('wallet-auth-verify', `${ip}:${walletAddress}`);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletVerify);

    if (!rateLimit.allowed) {
      return apiRateLimited(rateLimit, 'Too many verification attempts. Please wait before trying again.');
    }

    // Atomically consume nonce (prevents race condition / replay attacks)
    const nonceData = await consumeNonce(walletAddress);

    if (!nonceData) {
      return apiBadRequest('No pending authentication found or nonce expired. Please request a new nonce.');
    }

    // Reconstruct the message that was signed
    const message = createSignMessage(walletAddress, nonceData.nonce);
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature
    let isValid = false;
    try {
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);
      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch {
      return apiBadRequest('Invalid signature format');
    }

    if (!isValid) {
      return apiBadRequest('Signature verification failed');
    }

    // Authenticate user (creates account if new)
    const { token, userId, isNewUser } = await authenticateByWallet(walletAddress);

    // Set session cookie
    await setSessionCookie(token);

    return apiOk({
      success: true,
      message: isNewUser ? 'Account created successfully!' : 'Welcome back!',
      userId,
      walletAddress,
      isNewUser,
      pumpFunProfile: getPumpFunProfileUrl(walletAddress),
    });
  } catch (error) {
    console.error('Error verifying wallet auth:', error);
    return apiError(error);
  }
}
