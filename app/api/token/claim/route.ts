import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTokenByMint, upsertToken, getWalletsByUserId } from '@/lib/db';
import { getAssetByMint } from '@/lib/helius';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mintAddress } = await request.json();

    if (!mintAddress) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }

    // Check if token is already claimed
    const existingToken = await getTokenByMint(mintAddress);
    if (existingToken?.user_id) {
      return NextResponse.json({ error: 'Token is already claimed by another user' }, { status: 400 });
    }

    // Get user's verified wallets
    const userWallets = await getWalletsByUserId(session.user.id);
    if (userWallets.length === 0) {
      return NextResponse.json(
        { error: 'You need to connect and verify a wallet first' },
        { status: 400 }
      );
    }

    const userWalletAddresses = new Set(userWallets.map((w) => w.address.toLowerCase()));

    // Fetch token info from Helius
    const asset = await getAssetByMint(mintAddress);
    if (!asset) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Determine creator wallet from authorities
    let creatorWallet = '';
    if (asset.authorities && asset.authorities.length > 0) {
      const mintAuth = asset.authorities.find((a) => a.scopes.includes('mint'));
      const updateAuth = asset.authorities.find((a) => a.scopes.includes('metadata'));
      creatorWallet = mintAuth?.address || updateAuth?.address || asset.authorities[0].address;
    }

    // Fallback to creators array
    if (!creatorWallet && asset.creators && asset.creators.length > 0) {
      creatorWallet = asset.creators[0].address;
    }

    // Fallback to ownership
    if (!creatorWallet && asset.ownership?.owner) {
      creatorWallet = asset.ownership.owner;
    }

    if (!creatorWallet) {
      return NextResponse.json(
        { error: 'Could not determine token creator' },
        { status: 400 }
      );
    }

    // Verify user owns the creator wallet
    if (!userWalletAddresses.has(creatorWallet.toLowerCase())) {
      return NextResponse.json(
        { error: 'You must verify ownership of the creator wallet to claim this token' },
        { status: 403 }
      );
    }

    // Claim the token
    const token = await upsertToken({
      mint_address: mintAddress,
      name: asset.content?.metadata?.name || 'Unknown Token',
      symbol: asset.content?.metadata?.symbol || '???',
      creator_wallet: creatorWallet,
      user_id: session.user.id,
      launch_date: new Date().toISOString(),
      status: 'active',
      score: 10, // Base score, will be recalculated on profile view
    });

    return NextResponse.json({
      success: true,
      token: {
        mint: token.mint_address,
        name: token.name,
        symbol: token.symbol,
      },
    });
  } catch (error) {
    console.error('Token claim error:', error);
    return NextResponse.json({ error: 'Failed to claim token' }, { status: 500 });
  }
}
