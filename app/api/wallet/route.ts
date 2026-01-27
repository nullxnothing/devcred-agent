import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWalletsByUserId, deleteWallet, setWalletPrimary } from '@/lib/db';

// GET /api/wallet - Get all wallets for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const wallets = await getWalletsByUserId(session.user.id);

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}

// DELETE /api/wallet - Remove a wallet
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteWallet(walletId, session.user.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Wallet not found or not owned by user' },
        { status: 404 }
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

// PATCH /api/wallet - Set primary wallet
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { walletId } = await request.json();

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID is required' },
        { status: 400 }
      );
    }

    const updated = await setWalletPrimary(walletId, session.user.id);

    if (!updated) {
      return NextResponse.json(
        { error: 'Wallet not found or not owned by user' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting primary wallet:', error);
    return NextResponse.json(
      { error: 'Failed to set primary wallet' },
      { status: 500 }
    );
  }
}
