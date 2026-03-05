/**
 * @deprecated Use /api/auth/wallet/verify instead
 * Legacy endpoint for Twitter-first auth flow (requires session)
 * Links wallet to existing Twitter-authenticated account
 */

import { NextRequest } from 'next/server';
import { getWalletByAddress, createWallet, getWalletsByUserId, updateUser, getKolByWallet, linkKolToUser } from '@/lib/db';
import { getNonce, deleteNonce, createSignMessage } from '@/lib/nonce-store';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMIT_CONFIGS } from '@/lib/api-rate-limiter';
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { apiOk, apiRateLimited, apiBadRequest, apiForbidden, apiConflict, apiError, withDeprecation } from '@/lib/api-response';
import { validateBody } from '@/lib/api-validation';
import { walletVerifyRequestSchema } from '@/lib/validation';
import { requireNextAuth } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    // Require Twitter session
    const auth = await requireNextAuth();
    if (auth.error) return withDeprecation(auth.error, 'Use /api/auth/wallet/verify instead');

    // Rate limiting
    const rateLimitId = getRateLimitIdentifier('wallet-verify', auth.user.id);
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMIT_CONFIGS.walletVerify);
    if (!rateLimit.allowed) {
      return withDeprecation(
        apiRateLimited(rateLimit, 'Too many verification attempts. Please wait.'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Validate request body
    const validation = await validateBody(request, walletVerifyRequestSchema);
    if (validation.error) return withDeprecation(validation.error, 'Use /api/auth/wallet/verify instead');
    const { walletAddress, signature } = validation.data;

    // Validate wallet address is a valid Solana public key
    try {
      new PublicKey(walletAddress);
    } catch {
      return withDeprecation(
        apiBadRequest('Invalid Solana wallet address format'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Get stored nonce data
    const nonceData = await getNonce(walletAddress);

    if (!nonceData) {
      return withDeprecation(
        apiBadRequest('No pending verification found. Please request a new nonce.'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Check expiry
    if (Date.now() > nonceData.expiresAt) {
      await deleteNonce(walletAddress);
      return withDeprecation(
        apiBadRequest('Verification expired. Please request a new nonce.'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Check user matches
    if (nonceData.userId !== auth.user.id) {
      return withDeprecation(
        apiForbidden('User mismatch. Please request a new nonce.'),
        'Use /api/auth/wallet/verify instead'
      );
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
      return withDeprecation(
        apiBadRequest('Invalid signature format'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    if (!isValid) {
      return withDeprecation(
        apiBadRequest('Signature verification failed'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Delete used nonce
    await deleteNonce(walletAddress);

    // Check if wallet is already linked to another user
    const existingWallet = await getWalletByAddress(walletAddress);
    if (existingWallet && existingWallet.user_id !== auth.user.id) {
      return withDeprecation(
        apiConflict('This wallet is already linked to another account'),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // If wallet already linked to this user, return success
    if (existingWallet && existingWallet.user_id === auth.user.id) {
      return withDeprecation(
        apiOk({
          success: true,
          message: 'Wallet already verified',
          wallet: existingWallet,
        }),
        'Use /api/auth/wallet/verify instead'
      );
    }

    // Get existing wallets to determine if this should be primary
    const existingWallets = await getWalletsByUserId(auth.user.id);
    const isPrimary = existingWallets.length === 0;

    // Create new wallet link
    const newWallet = await createWallet({
      user_id: auth.user.id,
      address: walletAddress,
      is_primary: isPrimary,
    });

    // Update user verification status
    await updateUser(auth.user.id, { is_verified: true });

    // Check if this wallet belongs to a KOL and link if so
    let isKol = false;
    try {
      const kol = await getKolByWallet(walletAddress);
      if (kol && !kol.user_id) {
        await linkKolToUser(walletAddress, auth.user.id);
        isKol = true;
      } else if (kol && kol.user_id === auth.user.id) {
        isKol = true;
      }
    } catch {
      // KOL linking is best-effort
    }

    return withDeprecation(
      apiOk({
        success: true,
        message: isKol ? 'Wallet verified successfully. KOL profile claimed!' : 'Wallet verified successfully',
        wallet: newWallet,
        isKol,
      }),
      'Use /api/auth/wallet/verify instead'
    );
  } catch (error) {
    return apiError(error);
  }
}
