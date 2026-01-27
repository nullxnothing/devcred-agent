import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getWalletByAddress, createWallet, getWalletsByUserId, updateUser } from '@/lib/db';
import { getNonce, deleteNonce, createSignMessage } from '@/lib/nonce-store';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in with Twitter first.' },
        { status: 401 }
      );
    }

    const { walletAddress, signature } = await request.json();

    if (!walletAddress || !signature) {
      return NextResponse.json(
        { error: 'Wallet address and signature are required' },
        { status: 400 }
      );
    }

    // Get stored nonce data
    const nonceData = getNonce(walletAddress);

    if (!nonceData) {
      return NextResponse.json(
        { error: 'No pending verification found. Please request a new nonce.' },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > nonceData.expiresAt) {
      deleteNonce(walletAddress);
      return NextResponse.json(
        { error: 'Verification expired. Please request a new nonce.' },
        { status: 400 }
      );
    }

    // Check user matches
    if (nonceData.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'User mismatch. Please request a new nonce.' },
        { status: 403 }
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
    deleteNonce(walletAddress);

    // Check if wallet is already linked to another user
    const existingWallet = await getWalletByAddress(walletAddress);
    if (existingWallet && existingWallet.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'This wallet is already linked to another account' },
        { status: 409 }
      );
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
    await updateUser(session.user.id, {
      is_verified: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet verified successfully',
      wallet: newWallet,
    });
  } catch (error) {
    console.error('Error verifying wallet:', error);
    return NextResponse.json(
      { error: 'Failed to verify wallet' },
      { status: 500 }
    );
  }
}
