/**
 * @deprecated Use /api/auth/wallet/nonce instead
 * Legacy endpoint for Twitter-first auth flow (requires session)
 */

import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { setNonce, cleanupExpiredNonces, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { apiOk, apiRateLimited, apiError, withDeprecation } from '@/lib/api-response';
import { validateBody } from '@/lib/api-validation';
import { walletNonceRequestSchema } from '@/lib/validation';
import { requireNextAuth } from '@/lib/api-auth';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Require Twitter session
    const auth = await requireNextAuth();
    if (auth.error) return withDeprecation(auth.error, 'Use /api/auth/wallet/nonce instead');

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('wallet-nonce', auth.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletNonce);
    if (!rateLimit.allowed) {
      return withDeprecation(
        apiRateLimited(rateLimit, 'Too many nonce requests. Please wait before trying again.'),
        'Use /api/auth/wallet/nonce instead'
      );
    }

    // Validate request body
    const validation = await validateBody(request, walletNonceRequestSchema);
    if (validation.error) return withDeprecation(validation.error, 'Use /api/auth/wallet/nonce instead');
    const { walletAddress } = validation.data;

    // Clean up old nonces (non-blocking)
    cleanupExpiredNonces().catch(() => {});

    // Generate unique nonce
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + NONCE_EXPIRY_MS;

    // Store nonce with user association
    await setNonce(walletAddress, auth.user.id, nonce);

    // Create message for signing
    const message = createSignMessage(walletAddress, nonce);

    return withDeprecation(
      apiOk({ nonce, message, expiresAt }),
      'Use /api/auth/wallet/nonce instead'
    );
  } catch (error) {
    console.error('Error generating nonce:', error);
    return apiError(error);
  }
}
