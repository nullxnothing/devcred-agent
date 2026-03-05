/**
 * DELETE /api/wallets/[address] - Remove a linked wallet by address
 * GET /api/wallets/[address] - Get wallet info
 *
 * Supports wallet-first auth (dk_session cookie)
 * Cannot delete primary wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletByAddress, deleteWalletByAddress, getUserById } from '@/lib/db';
import { isValidSolanaAddress } from '@/lib/validation/solana';
import { apiOk, apiBadRequest, apiNotFound, apiForbidden, apiError, withCache } from '@/lib/api-response';
import { requireWalletAuth } from '@/lib/api-auth';

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Require wallet auth
    const auth = await requireWalletAuth();
    if (auth.error) return auth.error;

    const { address } = await params;

    if (!address || !isValidSolanaAddress(address)) {
      return apiBadRequest('Invalid wallet address');
    }

    // Check if wallet exists and belongs to user
    const wallet = await getWalletByAddress(address);

    if (!wallet) {
      return apiNotFound('Wallet', address);
    }

    if (wallet.user_id !== auth.session.userId) {
      return apiForbidden('Wallet not owned by this user');
    }

    // Cannot delete primary wallet
    if (wallet.is_primary) {
      return apiBadRequest('Cannot delete primary wallet. Set another wallet as primary first.');
    }

    // Check if this is the user's primary_wallet in dk_users
    const user = await getUserById(auth.session.userId);
    if (user?.primary_wallet === address) {
      return apiBadRequest('Cannot delete primary wallet. Set another wallet as primary first.');
    }

    const deleted = await deleteWalletByAddress(address, auth.session.userId);

    if (!deleted) {
      return apiError(new Error('Failed to delete wallet'));
    }

    return apiOk({ success: true });
  } catch (error) {
    console.error('Error deleting wallet:', error);
    return apiError(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { address } = await params;

    if (!address || !isValidSolanaAddress(address)) {
      return apiBadRequest('Invalid wallet address');
    }

    const wallet = await getWalletByAddress(address);

    if (!wallet) {
      return apiNotFound('Wallet', address);
    }

    // Cache wallet info for 60 seconds
    return withCache(
      apiOk({
        address: wallet.address,
        label: wallet.label,
        is_primary: wallet.is_primary,
        verified_at: wallet.verified_at,
      }),
      60
    );
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return apiError(error);
  }
}
