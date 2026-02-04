/**
 * DELETE /api/wallets/[address] - Remove a linked wallet by address
 *
 * Supports wallet-first auth (dk_session cookie)
 * Cannot delete primary wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookie } from '@/lib/wallet-auth';
import { getWalletByAddress, deleteWalletByAddress, getUserById } from '@/lib/db';
import { isValidSolanaAddress } from '@/lib/validation/solana';

interface RouteParams {
  params: Promise<{ address: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSessionFromCookie();

    if (!session?.userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { address } = await params;

    if (!address || !isValidSolanaAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Check if wallet exists and belongs to user
    const wallet = await getWalletByAddress(address);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    if (wallet.user_id !== session.userId) {
      return NextResponse.json(
        { error: 'Wallet not owned by this user' },
        { status: 403 }
      );
    }

    // Cannot delete primary wallet
    if (wallet.is_primary) {
      return NextResponse.json(
        { error: 'Cannot delete primary wallet. Set another wallet as primary first.' },
        { status: 400 }
      );
    }

    // Check if this is the user's primary_wallet in dk_users
    const user = await getUserById(session.userId);
    if (user?.primary_wallet === address) {
      return NextResponse.json(
        { error: 'Cannot delete primary wallet. Set another wallet as primary first.' },
        { status: 400 }
      );
    }

    const deleted = await deleteWalletByAddress(address, session.userId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete wallet' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting wallet:', error);
    return NextResponse.json(
      { error: 'Failed to delete wallet' },
      { status: 500 }
    );
  }
}

// GET /api/wallets/[address] - Get wallet info
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { address } = await params;

    if (!address || !isValidSolanaAddress(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const wallet = await getWalletByAddress(address);

    if (!wallet) {
      return NextResponse.json(
        { error: 'Wallet not found' },
        { status: 404 }
      );
    }

    // Return limited info (don't expose user_id)
    return NextResponse.json({
      address: wallet.address,
      label: wallet.label,
      is_primary: wallet.is_primary,
      verified_at: wallet.verified_at,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallet' },
      { status: 500 }
    );
  }
}
