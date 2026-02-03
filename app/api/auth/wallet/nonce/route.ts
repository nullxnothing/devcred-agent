/**
 * Public endpoint to request a nonce for wallet authentication
 * No session required - this is the first step in wallet login
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { setNoncePublic, cleanupExpiredNonces, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
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

    // Rate limiting by IP + wallet address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitId = getRateLimitIdentifier('wallet-auth-nonce', `${ip}:${walletAddress}`);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletNonce);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many nonce requests. Please wait before trying again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Clean up old nonces (non-blocking)
    cleanupExpiredNonces().catch(() => {});

    // Generate a secure random nonce
    const nonce = randomBytes(32).toString('hex');

    // Store nonce in database (no userId required for public auth)
    await setNoncePublic(walletAddress, nonce);

    // Create the message for the user to sign
    const message = createSignMessage(walletAddress, nonce);

    return NextResponse.json({
      message,
      nonce,
      expiresIn: NONCE_EXPIRY_MS,
    });
  } catch (error) {
    console.error('Error generating auth nonce:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate nonce', details: errorMessage },
      { status: 500 }
    );
  }
}
