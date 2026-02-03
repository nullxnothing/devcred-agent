/**
 * Re-scan all existing wallets to find tokens missed by the old detection method
 * This uses the new feePayer-based verification to catch pump.fun tokens
 *
 * Usage: npx tsx scripts/rescan-wallets.ts
 */

import { pool } from '../lib/db';
import { getMigratedTokensFromSwapHistory } from '../lib/helius';
import { detectTokensCreatedByWallet } from '../lib/token-detection';
import { getMigrationStatusCombined } from '../lib/dexscreener';

interface WalletRow {
  id: string;
  user_id: string;
  address: string;
}

interface TokenRow {
  mint_address: string;
}

async function rescanAllWallets() {
  console.log('=== Re-scanning all wallets for missed tokens ===');
  console.log('');

  // Get all wallets from the database
  const walletsResult = await pool.query<WalletRow>(
    'SELECT id, user_id, address FROM dk_wallets ORDER BY created_at ASC'
  );

  const wallets = walletsResult.rows;
  console.log('Found ' + wallets.length + ' wallets to scan');
  console.log('');

  let totalNewTokens = 0;
  let totalWalletsUpdated = 0;

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const shortAddr = wallet.address.substring(0, 8) + '...';
    console.log('[' + (i + 1) + '/' + wallets.length + '] Scanning wallet: ' + shortAddr);

    try {
      // Get existing tokens for this wallet
      const existingResult = await pool.query<TokenRow>(
        'SELECT mint_address FROM dk_tokens WHERE creator_wallet = $1',
        [wallet.address]
      );
      const existingMints = new Set(existingResult.rows.map(r => r.mint_address));
      console.log('  Existing tokens in DB: ' + existingMints.size);

      // Scan wallet using NEW transaction signer-based method
      const scanResult = await detectTokensCreatedByWallet(wallet.address);
      console.log('  Tokens found by scan: ' + scanResult.totalFound);

      // Get migration status for tokens
      const tokenMints = new Set(scanResult.tokens.map(t => t.mintAddress));
      const migratedTokens = await getMigratedTokensFromSwapHistory(wallet.address, tokenMints);

      // Find new tokens not in database
      const newTokens = scanResult.tokens.filter(t => !existingMints.has(t.mintAddress));
      console.log('  New tokens to add: ' + newTokens.length);

      if (newTokens.length === 0) {
        console.log('  No new tokens found, skipping...');
        console.log('');
        continue;
      }

      totalWalletsUpdated++;

      // Insert new tokens
      for (const token of newTokens) {
        const migrationInfo = migratedTokens.get(token.mintAddress);

        // Skip rug detection for speed - can be run separately later
        const rugSeverity: 'soft' | 'hard' | null = null;
        const devSellPercent = 0;
        const isRug = false;

        // Use migration info from scan (skip extra API call for speed)
        const migrated = !!migrationInfo;
        const migratedAt: string | null = migrationInfo
          ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString()
          : null;
        const migrationPoolAddress: string | null = null;

        // Calculate initial score
        let score = 10; // Base score
        if (migrated) score = 50;
        if (isRug) score = 0;

        const launchDate = token.creationTimestamp
          ? new Date(token.creationTimestamp * 1000).toISOString()
          : new Date().toISOString();

        const metadata = JSON.stringify({
          rescan_date: new Date().toISOString(),
          creation_verified: token.confidence === 'high',
          creation_method: token.creationMethod,
        });

        // Insert token
        await pool.query(
          `INSERT INTO dk_tokens (
            mint_address, name, symbol, creator_wallet, user_id, launch_date,
            migrated, migrated_at, status, score, creation_signature,
            creation_verified, migration_pool_address, rug_severity, dev_sell_percent,
            metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT (mint_address) DO UPDATE SET
            creation_signature = COALESCE(EXCLUDED.creation_signature, dk_tokens.creation_signature),
            creation_verified = COALESCE(EXCLUDED.creation_verified, dk_tokens.creation_verified),
            migrated = EXCLUDED.migrated,
            migrated_at = COALESCE(EXCLUDED.migrated_at, dk_tokens.migrated_at),
            migration_pool_address = COALESCE(EXCLUDED.migration_pool_address, dk_tokens.migration_pool_address),
            rug_severity = COALESCE(EXCLUDED.rug_severity, dk_tokens.rug_severity),
            dev_sell_percent = COALESCE(EXCLUDED.dev_sell_percent, dk_tokens.dev_sell_percent),
            status = CASE WHEN EXCLUDED.rug_severity IS NOT NULL THEN 'rug'::dk_token_status ELSE dk_tokens.status END,
            updated_at = NOW()`,
          [
            token.mintAddress,
            token.name,
            token.symbol,
            wallet.address,
            wallet.user_id,
            launchDate,
            migrated,
            migratedAt,
            isRug ? 'rug' : 'active',
            score,
            token.creationSignature || null,
            token.confidence === 'high',
            migrationPoolAddress,
            rugSeverity,
            devSellPercent,
            metadata,
          ]
        );

        const shortMint = token.mintAddress.substring(0, 8) + '...';
        console.log('    + Added: ' + token.symbol + ' (' + shortMint + ')');
        totalNewTokens++;
      }

      // Update user's total score using base-500 system
      const scoreResult = await pool.query(`
        SELECT
          COUNT(*) as total_tokens,
          COUNT(*) FILTER (WHERE migrated = true) as migrated_count,
          COUNT(*) FILTER (WHERE status = 'rug') as rug_count,
          COALESCE(AVG(score), 0) as avg_score
        FROM dk_tokens
        WHERE user_id = $1
      `, [wallet.user_id]);

      const stats = scoreResult.rows[0];
      const baseScore = 500; // New base score system
      const migrationBonus = parseInt(stats.migrated_count) * 30;
      const tokenBonus = parseInt(stats.total_tokens) * Math.floor(parseFloat(stats.avg_score) / 10);
      const rugPenalty = parseInt(stats.rug_count) * 100;
      const newScore = Math.min(740, Math.max(300, baseScore + migrationBonus + tokenBonus - rugPenalty));

      await pool.query(
        'UPDATE dk_users SET total_score = $1, updated_at = NOW() WHERE id = $2',
        [newScore, wallet.user_id]
      );

      console.log('  Updated user score: ' + newScore);
      console.log('');

    } catch (error: any) {
      console.error('  Error scanning wallet: ' + error.message);
      console.log('');
    }

    // Rate limiting - wait between wallets to avoid API limits
    await new Promise(r => setTimeout(r, 1000));
  }

  // Update all ranks
  console.log('Updating ranks...');
  await pool.query(`
    WITH ranked AS (
      SELECT DISTINCT u.id,
             ROW_NUMBER() OVER (ORDER BY u.total_score DESC, u.created_at ASC) as new_rank
      FROM dk_users u
      INNER JOIN dk_wallets w ON u.id = w.user_id
    )
    UPDATE dk_users
    SET rank = ranked.new_rank
    FROM ranked
    WHERE dk_users.id = ranked.id
  `);

  console.log('');
  console.log('=== Rescan Complete ===');
  console.log('Wallets scanned: ' + wallets.length);
  console.log('Wallets with new tokens: ' + totalWalletsUpdated);
  console.log('Total new tokens added: ' + totalNewTokens);

  await pool.end();
}

// Run
rescanAllWallets().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
