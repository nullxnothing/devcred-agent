import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomBytes } from 'crypto';
import { setNonce, cleanupExpiredNonces, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with Twitter first.' },
        { status: 401 }
      );
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('wallet-nonce', session.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletNonce);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many nonce requests. Please wait before trying again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate Solana address format (base58, 32-44 chars)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid Solana wallet address' },
        { status: 400 }
      );
    }

    // Clean up old nonces (non-blocking)
    cleanupExpiredNonces().catch(() => {});

    // Generate unique nonce
    const nonce = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + NONCE_EXPIRY_MS;

    // Store nonce with user association (database-backed for multi-instance support)
    await setNonce(walletAddress, session.user.id, nonce);

    // Create message for signing
    const message = createSignMessage(walletAddress, nonce);

    return NextResponse.json({
      nonce,
      message,
      expiresAt,
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    );
  }
}
