/**
 * Public endpoint to request a nonce for wallet authentication
 * No session required - this is the first step in wallet login
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { setNoncePublic, cleanupExpiredNonces, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { apiOk, apiRateLimited, apiError } from '@/lib/api-response';
import { validateBody, getClientIp } from '@/lib/api-validation';
import { walletNonceRequestSchema } from '@/lib/validation';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(request, walletNonceRequestSchema);
    if (validation.error) return validation.error;
    const { walletAddress } = validation.data;

    // Rate limiting by IP + wallet address
    const ip = getClientIp(request);
    const rateLimitId = getRateLimitIdentifier('wallet-auth-nonce', `${ip}:${walletAddress}`);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletNonce);

    if (!rateLimit.allowed) {
      return apiRateLimited(rateLimit, 'Too many nonce requests. Please wait before trying again.');
    }

    // Clean up old nonces (non-blocking)
    cleanupExpiredNonces().catch(() => {});

    // Generate a secure random nonce
    const nonce = randomBytes(32).toString('hex');

    // Store nonce in database (no userId required for public auth)
    await setNoncePublic(walletAddress, nonce);

    // Create the message for the user to sign
    const message = createSignMessage(walletAddress, nonce);

    return apiOk({
      message,
      nonce,
      expiresIn: NONCE_EXPIRY_MS,
    });
  } catch (error) {
    console.error('Error generating auth nonce:', error);
    return apiError(error);
  }
}
