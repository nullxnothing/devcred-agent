import { NextRequest } from 'next/server';
import { apiOk, apiBadRequest, apiError } from '@/lib/api-response';
import { getWalletsByUserId, getTokensForUserWallets } from '@/lib/db';
import { detectTokensCreatedByWallet } from '@/lib/token-detection';
import { getMigratedTokensFromSwapHistory, detectRugPattern } from '@/lib/helius';
import { upsertToken } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, userId } = body;

    if (!walletAddress || !userId) {
      return apiBadRequest('Missing walletAddress or userId');
    }

    // Check if already scanned
    const existing = await getTokensForUserWallets(userId);
    if (existing.length > 0) {
      return apiOk({ message: 'Wallet already scanned', tokenCount: existing.length });
    }

    // Scan for tokens
    const scanResult = await detectTokensCreatedByWallet(walletAddress);
    
    if (scanResult.tokens.length === 0) {
      return apiOk({ message: 'No tokens found', tokenCount: 0 });
    }

    // Check migrations
    let migratedTokens = new Map<string, { firstSwapTimestamp: number }>();
    try {
      const tokenMints = new Set(scanResult.tokens.map(t => t.mintAddress));
      migratedTokens = await getMigratedTokensFromSwapHistory(walletAddress, tokenMints);
    } catch (error) {
      console.error('[wallet-scan] Migration check failed:', error);
    }

    // Save tokens
    const results = await Promise.allSettled(
      scanResult.tokens.map(async (tokenData) => {
        const migrationInfo = migratedTokens.get(tokenData.mintAddress);

        let rugDetection: { isRug: boolean; severity: 'soft' | 'hard' | null; sellPercent: number } = { 
          isRug: false, 
          severity: null, 
          sellPercent: 0 
        };
        try {
          rugDetection = await detectRugPattern(
            walletAddress,
            tokenData.mintAddress,
            tokenData.creationTimestamp
          );
        } catch (error) {
          console.error('[wallet-scan] Rug detection failed:', error);
        }

        return upsertToken({
          mint_address: tokenData.mintAddress,
          name: tokenData.name,
          symbol: tokenData.symbol,
          creator_wallet: walletAddress,
          user_id: userId,
          launch_date: tokenData.creationTimestamp
            ? new Date(tokenData.creationTimestamp * 1000).toISOString()
            : new Date().toISOString(),
          migrated: !!migrationInfo,
          migrated_at: migrationInfo
            ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString()
            : undefined,
          status: rugDetection.isRug ? 'rug' : 'active',
          score: migrationInfo ? 50 : (rugDetection.isRug ? 0 : 10),
          metadata: {
            creation_signature: tokenData.creationSignature,
            creation_verified: tokenData.confidence === 'high',
            creation_method: tokenData.creationMethod,
            rug_severity: rugDetection.severity,
            dev_sell_percent: rugDetection.sellPercent,
          },
        });
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return apiOk({
      message: 'Scan complete',
      tokenCount: successful,
      totalFound: scanResult.tokens.length,
    });
  } catch (error) {
    console.error('[wallet-scan] Error:', error);
    return apiError('Scan failed', error);
  }
}
