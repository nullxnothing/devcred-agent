import { NextRequest, NextResponse } from 'next/server';
import { getTokenByMint } from '@/lib/db';
import { getAssetByMint } from '@/lib/helius';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');

    if (!mint) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }

    // First check if we already have this token in DB
    const existingToken = await getTokenByMint(mint);
    if (existingToken) {
      return NextResponse.json({
        mint: existingToken.mint_address,
        name: existingToken.name,
        symbol: existingToken.symbol,
        creatorWallet: existingToken.creator_wallet,
        alreadyClaimed: !!existingToken.user_id,
      });
    }

    // If not in DB, fetch from Helius DAS API
    const asset = await getAssetByMint(mint);

    if (!asset) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    // Try to get creator from authorities
    let creatorWallet = '';
    if (asset.authorities && asset.authorities.length > 0) {
      // Find mint authority or update authority
      const mintAuth = asset.authorities.find((a) => a.scopes.includes('mint'));
      const updateAuth = asset.authorities.find((a) => a.scopes.includes('metadata'));
      creatorWallet = mintAuth?.address || updateAuth?.address || asset.authorities[0].address;
    }

    // Fallback to ownership info
    if (!creatorWallet && asset.ownership?.owner) {
      creatorWallet = asset.ownership.owner;
    }

    return NextResponse.json({
      mint: asset.id,
      name: asset.content?.metadata?.name || 'Unknown Token',
      symbol: asset.content?.metadata?.symbol || '???',
      creatorWallet,
      alreadyClaimed: false,
    });
  } catch (error) {
    console.error('Token lookup error:', error);
    return NextResponse.json({ error: 'Failed to lookup token' }, { status: 500 });
  }
}
