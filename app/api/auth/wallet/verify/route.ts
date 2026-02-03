/**
 * Verify wallet signature and create/return session
 * This is the main authentication endpoint for wallet-first auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getNonce, deleteNonce, createSignMessage } from '@/lib/nonce-store';
import { authenticateByWallet, setSessionCookie, getPumpFunProfileUrl } from '@/lib/wallet-auth';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, signature } = await request.json();

    if (!walletAddress || !signature) {
      return NextResponse.json(
        { error: 'Wallet address and signature are required' },
        { status: 400 }
      );
    }

    // Validate wallet address is a valid Solana public key
    try {
      new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Rate limiting by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const rateLimitId = getRateLimitIdentifier('wallet-auth-verify', `${ip}:${walletAddress}`);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletVerify);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait before trying again.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      );
    }

    // Get stored nonce data
    const nonceData = await getNonce(walletAddress);

    if (!nonceData) {
      return NextResponse.json(
        { error: 'No pending authentication found. Please request a new nonce.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > nonceData.expiresAt) {
      await deleteNonce(walletAddress);
      return NextResponse.json(
        { error: 'Authentication expired. Please request a new nonce.' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Invalid signature format' },
        { status: 400 }
      );
    }

    if (!isValid) {
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 400 }
      );
    }

    // Delete used nonce
    await deleteNonce(walletAddress);

    // Authenticate user (creates account if new)
    const { token, userId, isNewUser } = await authenticateByWallet(walletAddress);

    // Set session cookie
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: isNewUser ? 'Account created successfully!' : 'Welcome back!',
      userId,
      walletAddress,
      isNewUser,
      pumpFunProfile: getPumpFunProfileUrl(walletAddress),
    });
  } catch (error) {
    console.error('Error verifying wallet auth:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Authentication failed', details: errorMessage },
      { status: 500 }
    );
  }
}
