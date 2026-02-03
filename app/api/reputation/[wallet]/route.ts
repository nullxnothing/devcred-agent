/**
 * Pre-computed Reputation API
 *
 * GET /api/reputation/:wallet
 *
 * Returns the pre-computed reputation score for a wallet.
 * If not in database, triggers a scan and returns the result.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserByWallet, getTokensByCreatorWallet } from '@/lib/db';
import { scanWalletQuick } from '@/lib/wallet-scan';
import { isValidSolanaAddress } from '@/lib/validation/solana';

interface ReputationResponse {
  wallet: string;
  score: number;
  tier: string;
  tierName: string;
  tokenCount: number;
  rugCount: number;
  migrationCount: number;
  lastScanned: string | null;
  source: 'cached' | 'fresh';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
): Promise<NextResponse> {
  const { wallet } = await params;

  // Validate wallet address
  if (!isValidSolanaAddress(wallet)) {
    return NextResponse.json(
      { error: 'Invalid Solana wallet address' },
      { status: 400 }
    );
  }

  try {
    // Check if we have pre-computed data
    const user = await getUserByWallet(wallet);

    if (user && user.total_score > 0) {
      // Get token breakdown
      const tokens = await getTokensByCreatorWallet(wallet);
      const rugCount = tokens.filter(t => t.status === 'rug').length;
      const migrationCount = tokens.filter(t => t.migrated).length;

      const response: ReputationResponse = {
        wallet,
        score: user.total_score,
        tier: user.tier || 'unverified',
        tierName: getTierName(user.tier || 'unverified'),
        tokenCount: tokens.length,
        rugCount,
        migrationCount,
        lastScanned: user.updated_at,
        source: 'cached',
      };

      return NextResponse.json(response);
    }

    // No cached data, perform fresh scan
    const result = await scanWalletQuick(wallet);

    const response: ReputationResponse = {
      wallet,
      score: result.totalScore,
      tier: result.tier,
      tierName: result.tierName,
      tokenCount: result.breakdown.tokenCount,
      rugCount: result.breakdown.rugCount,
      migrationCount: result.breakdown.migrationCount,
      lastScanned: new Date().toISOString(),
      source: 'fresh',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reputation API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reputation' },
      { status: 500 }
    );
  }
}

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    legend: 'Legend',
    elite: 'Elite',
    proven: 'Proven',
    builder: 'Builder',
    verified: 'Verified',
    penalized: 'Penalized',
    unverified: 'Unverified',
  };
  return names[tier] || 'Unknown';
}
