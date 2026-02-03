import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWalletByAddress, createWallet, getWalletsByUserId, updateUser, getKolByWallet, linkKolToUser } from '@/lib/db';
import { getNonce, deleteNonce, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, rateLimitHeaders, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { handleApiError, UnauthorizedError, ValidationError, AppError } from '@/lib/errors';
import { parseRequestBody, solanaAddressSchema } from '@/lib/validation';
import { z } from 'zod';

const verifyRequestSchema = z.object({
  walletAddress: solanaAddressSchema,
  signature: z.string().min(1, 'Signature is required'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      throw new UnauthorizedError('Please sign in with Twitter first.');
    }

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('wallet-verify', session.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletVerify);
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many verification attempts. Please wait.' } },
        { status: 429 }
      );
      Object.entries(rateLimitHeaders(rateLimit)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const { walletAddress, signature } = await parseRequestBody(request, verifyRequestSchema);

    // Validate wallet address is a valid Solana public key
    try {
      new PublicKey(walletAddress);
    } catch {
      throw new ValidationError('Invalid Solana wallet address format');
    }

    // Get stored nonce data
    const nonceData = await getNonce(walletAddress);

    if (!nonceData) {
      throw new ValidationError('No pending verification found. Please request a new nonce.');
    }

    // Check expiry
    if (Date.now() > nonceData.expiresAt) {
      await deleteNonce(walletAddress);
      throw new ValidationError('Verification expired. Please request a new nonce.');
    }

    // Check user matches
    if (nonceData.userId !== session.user.id) {
      throw new AppError('FORBIDDEN', 'User mismatch. Please request a new nonce.');
    }

    // Verify the signature
    const message = createSignMessage(walletAddress, nonceData.nonce);
    const messageBytes = new TextEncoder().encode(message);

    let isValid = false;
    try {
      const signatureBytes = bs58.decode(signature);
      const publicKeyBytes = bs58.decode(walletAddress);
      isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch {
      throw new ValidationError('Invalid signature format');
    }

    if (!isValid) {
      throw new ValidationError('Signature verification failed');
    }

    // Delete used nonce
    await deleteNonce(walletAddress);

    // Check if wallet is already linked to another user
    const existingWallet = await getWalletByAddress(walletAddress);
    if (existingWallet && existingWallet.user_id !== session.user.id) {
      throw new AppError('CONFLICT', 'This wallet is already linked to another account');
    }

    // If wallet already linked to this user, return success
    if (existingWallet && existingWallet.user_id === session.user.id) {
      return NextResponse.json({
        success: true,
        message: 'Wallet already verified',
        wallet: existingWallet,
      });
    }

    // Get existing wallets to determine if this should be primary
    const existingWallets = await getWalletsByUserId(session.user.id);
    const isPrimary = existingWallets.length === 0;

    // Create new wallet link
    const newWallet = await createWallet({
      user_id: session.user.id,
      address: walletAddress,
      is_primary: isPrimary,
    });

    // Update user verification status
    await updateUser(session.user.id, { is_verified: true });

    // Check if this wallet belongs to a KOL and link if so
    let isKol = false;
    try {
      const kol = await getKolByWallet(walletAddress);
      if (kol && !kol.user_id) {
        await linkKolToUser(walletAddress, session.user.id);
        isKol = true;
      } else if (kol && kol.user_id === session.user.id) {
        isKol = true;
      }
    } catch {
      // KOL linking is best-effort
    }

    return NextResponse.json({
      success: true,
      message: isKol ? 'Wallet verified successfully. KOL profile claimed!' : 'Wallet verified successfully',
      wallet: newWallet,
      isKol,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
