/**
 * Backfill Script for DevKarma Database
 * 
 * This script performs a comprehensive backfill of wallet data:
 * 1. Scans all existing wallets for new tokens (using verified feePayer detection)
 * 2. Enriches existing tokens with market data, migration status, and rug detection
 * 3. Recalculates all token scores with full breakdown
 * 4. Recalculates all dev scores using the base-500 system
 * 5. Updates all user ranks
 *
 * Usage: npx tsx scripts/backfill-wallet-data.ts [options]
 * 
 * Options:
 *   --wallets-only        Only scan for new tokens, skip enrichment
 *   --enrich-only         Only enrich existing tokens, skip wallet scan
 *   --scores-only         Only recalculate scores, skip wallet/token operations
 *   --dry-run             Preview changes without writing to database
 *   --with-rug-detection  Enable rug pattern detection (slower, may cause API errors)
 *   --wallet=ADDRESS      Only process a specific wallet address
 *   --limit=N             Limit number of wallets to process
 */

// Load environment variables from .env file
import 'dotenv/config';

import { pool } from '../lib/db';
import { detectRugPattern, getMigratedTokensFromSwapHistory, MigratedTokenInfo, getTokensCreatedByWalletViaFeePayer, TokenCreated } from '../lib/helius';
import { getTokenMarketData, getMigrationStatusCombined, batchGetTokenMarketData } from '../lib/dexscreener';
import { calculateTokenScore, calculateDevScore } from '../lib/scoring';

// Parse CLI arguments
const args = process.argv.slice(2);
const OPTIONS = {
  walletsOnly: args.includes('--wallets-only'),
  enrichOnly: args.includes('--enrich-only'),
  scoresOnly: args.includes('--scores-only'),
  dryRun: args.includes('--dry-run'),
  withRugDetection: args.includes('--with-rug-detection'),
  skipWhales: args.includes('--skip-whales'),
  maxTokensPerWallet: parseInt(args.find(a => a.startsWith('--max-tokens='))?.split('=')[1] || '0') || 100,
  specificWallet: args.find(a => a.startsWith('--wallet='))?.split('=')[1],
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || undefined,
};

// Stats tracking
const stats = {
  walletsScanned: 0,
  newTokensFound: 0,
  tokensEnriched: 0,
  scoresUpdated: 0,
  errors: 0,
};

interface WalletRow {
  id: string;
  user_id: string;
  address: string;
}

interface TokenRow {
  id: string;
  mint_address: string;
  name: string;
  symbol: string;
  creator_wallet: string;
  user_id: string;
  launch_date: string;
  migrated: boolean;
  migrated_at: string | null;
  status: string;
  score: number;
  current_market_cap: number | null;
  ath_market_cap: number | null;
  metadata: Record<string, unknown> | null;
}

interface UserRow {
  id: string;
  twitter_handle: string;
  total_score: number;
  created_at: string;
}

/**
 * Scan a wallet for new tokens and add them to the database
 */
async function scanWalletForNewTokens(wallet: WalletRow): Promise<number> {
  const shortAddr = `${wallet.address.substring(0, 8)}...`;
  console.log(`  Scanning wallet: ${shortAddr}`);

  try {
    // Get existing tokens for this wallet
    const existingResult = await pool.query<{ mint_address: string }>(
      'SELECT mint_address FROM dk_tokens WHERE creator_wallet = $1',
      [wallet.address]
    );
    const existingMints = new Set(existingResult.rows.map(r => r.mint_address));
    console.log(`    Existing tokens in DB: ${existingMints.size}`);

    // Skip whales (wallets with too many tokens) if --skip-whales is set
    if (OPTIONS.skipWhales && existingMints.size > OPTIONS.maxTokensPerWallet) {
      console.log(`    ⏭️  Skipping whale wallet (>${OPTIONS.maxTokensPerWallet} tokens)`);
      return 0;
    }

    // Scan wallet using NEW feePayer-based detection (faster and more accurate)
    const detectedTokens = await getTokensCreatedByWalletViaFeePayer(wallet.address);
    console.log(`    Tokens found by scan: ${detectedTokens.length}`);

    // Get migration status for tokens
    const tokenMints = new Set(detectedTokens.map(t => t.mintAddress));
    const migratedTokens = await getMigratedTokensFromSwapHistory(wallet.address, tokenMints);

    // Find new tokens not in database
    const newTokens = detectedTokens.filter(t => !existingMints.has(t.mintAddress));
    console.log(`    New tokens to add: ${newTokens.length}`);

    if (newTokens.length === 0) {
      return 0;
    }

    if (OPTIONS.dryRun) {
      console.log(`    [DRY RUN] Would add ${newTokens.length} tokens`);
      for (const token of newTokens) {
        console.log(`      - ${token.symbol} (${token.mintAddress.substring(0, 8)}...)`);
      }
      return newTokens.length;
    }

    // Insert new tokens
    for (const token of newTokens) {
      await insertNewToken(wallet, token, migratedTokens);
      console.log(`    + Added: ${token.symbol} (${token.mintAddress.substring(0, 8)}...)`);
    }

    return newTokens.length;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`    Error scanning wallet: ${message}`);
    stats.errors++;
    return 0;
  }
}

/**
 * Insert a new token into the database
 */
async function insertNewToken(
  wallet: WalletRow,
  token: TokenCreated,
  migrationMap: Map<string, MigratedTokenInfo>
): Promise<void> {
  const migrationInfo = migrationMap.get(token.mintAddress);

  // Detect rug pattern (skip for speed - can be run in enrichment phase)
  // This avoids Helius API 400 errors for tokens with unusual history
  const rugSeverity: 'soft' | 'hard' | null = null;
  const devSellPercent = 0;
  const isRug = false;

  const migrated = !!migrationInfo;
  const migratedAt = migrationInfo
    ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString()
    : null;

  // Calculate initial score
  let score = 10; // Base score
  if (migrated) score = 50;
  if (isRug) score = 0;

  const launchDate = token.creationTimestamp
    ? new Date(token.creationTimestamp * 1000).toISOString()
    : new Date().toISOString();

  const metadata = JSON.stringify({
    backfill_date: new Date().toISOString(),
    creation_signature: token.creationSignature,
    creation_verified: token.creationVerified === true,
    rug_severity: rugSeverity,
    dev_sell_percent: devSellPercent,
  });

  await pool.query(
    `INSERT INTO dk_tokens (
      mint_address, name, symbol, creator_wallet, user_id, launch_date,
      migrated, migrated_at, status, score, creation_signature,
      creation_verified, rug_severity, dev_sell_percent, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (mint_address) DO UPDATE SET
      creation_signature = COALESCE(EXCLUDED.creation_signature, dk_tokens.creation_signature),
      creation_verified = COALESCE(EXCLUDED.creation_verified, dk_tokens.creation_verified),
      migrated = EXCLUDED.migrated,
      migrated_at = COALESCE(EXCLUDED.migrated_at, dk_tokens.migrated_at),
      rug_severity = COALESCE(EXCLUDED.rug_severity, dk_tokens.rug_severity),
      dev_sell_percent = COALESCE(EXCLUDED.dev_sell_percent, dk_tokens.dev_sell_percent),
      status = CASE WHEN EXCLUDED.rug_severity IS NOT NULL THEN 'rug'::dk_token_status ELSE dk_tokens.status END,
      metadata = EXCLUDED.metadata,
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
      token.creationVerified === true,
      rugSeverity,
      devSellPercent,
      metadata,
    ]
  );
}

/**
 * Enrich a token with market data, migration status, and full scoring
 */
async function enrichToken(token: TokenRow): Promise<void> {
  const shortMint = `${token.mint_address.substring(0, 8)}...`;
  
  try {
    // Fetch market data from DexScreener
    const marketData = await getTokenMarketData(token.mint_address).catch(() => null);
    
    // Fetch migration status
    const migrationStatus = await getMigrationStatusCombined(token.mint_address).catch(() => ({
      migrated: token.migrated,
      migrationType: null,
      pool: null,
      liquidityUsd: 0,
      migratedAt: token.migrated_at ? new Date(token.migrated_at) : null,
    }));

    // Detect rug pattern if not already detected (only if --with-rug-detection flag is set)
    const existingMetadata = token.metadata || {};
    let rugDetection = {
      isRug: token.status === 'rug',
      severity: (existingMetadata as { rug_severity?: 'soft' | 'hard' | null }).rug_severity || null,
      sellPercent: (existingMetadata as { dev_sell_percent?: number }).dev_sell_percent || 0,
      totalReceived: 0,
      totalSold: 0,
    };

    if (OPTIONS.withRugDetection && !rugDetection.severity) {
      try {
        const launchTimestamp = new Date(token.launch_date).getTime() / 1000;
        rugDetection = await detectRugPattern(token.creator_wallet, token.mint_address, launchTimestamp);
      } catch {
        // Keep existing rug detection data - API may return 400 for some tokens
      }
    }

    // Calculate full token score
    const scoreResult = await calculateTokenScore({
      mintAddress: token.mint_address,
      creatorWallet: token.creator_wallet,
      launchDate: new Date(token.launch_date),
      isRugged: rugDetection.isRug,
      rugSeverity: rugDetection.severity,
      marketData,
      migrationStatus,
    });

    if (OPTIONS.dryRun) {
      console.log(`    [DRY RUN] Would update ${token.symbol} (${shortMint}): score ${token.score} -> ${scoreResult.score}`);
      return;
    }

    // Update token with enriched data
    const updatedMetadata = JSON.stringify({
      ...existingMetadata,
      enriched_at: new Date().toISOString(),
      rug_severity: rugDetection.severity,
      dev_sell_percent: rugDetection.sellPercent,
      score_breakdown: scoreResult.breakdown,
    });

    await pool.query(
      `UPDATE dk_tokens SET
        migrated = $1,
        migrated_at = COALESCE($2, migrated_at),
        current_market_cap = COALESCE($3, current_market_cap),
        ath_market_cap = GREATEST(COALESCE(ath_market_cap, 0), COALESCE($4, 0)),
        total_volume = COALESCE($5, total_volume),
        status = $6,
        score = $7,
        rug_severity = $8,
        dev_sell_percent = $9,
        metadata = $10,
        updated_at = NOW()
      WHERE id = $11`,
      [
        migrationStatus.migrated,
        migrationStatus.migratedAt?.toISOString() || null,
        marketData?.marketCap ? Math.round(marketData.marketCap) : null,
        marketData?.marketCap ? Math.round(marketData.marketCap) : null,
        marketData?.volume24h ? Math.round(marketData.volume24h) : null,
        rugDetection.isRug ? 'rug' : (migrationStatus.migrated ? 'active' : token.status),
        scoreResult.score,
        rugDetection.severity,
        rugDetection.sellPercent,
        updatedMetadata,
        token.id,
      ]
    );

    console.log(`    ✓ ${token.symbol}: score ${token.score} -> ${scoreResult.score}, migrated: ${migrationStatus.migrated}`);
    stats.tokensEnriched++;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`    ✗ ${token.symbol} (${shortMint}): ${message}`);
    stats.errors++;
  }
}

/**
 * Recalculate dev score for a user based on their tokens
 */
async function recalculateUserScore(user: UserRow): Promise<void> {
  try {
    // Get all tokens for this user
    const tokensResult = await pool.query<TokenRow>(
      `SELECT t.* FROM dk_tokens t
       INNER JOIN dk_wallets w ON t.creator_wallet = w.address
       WHERE w.user_id = $1`,
      [user.id]
    );
    const tokens = tokensResult.rows;

    if (tokens.length === 0) {
      console.log(`    No tokens found for ${user.twitter_handle}`);
      return;
    }

    // Calculate dev score
    const devScore = calculateDevScore({
      tokens: tokens.map(t => {
        const metadata = t.metadata as { rug_severity?: 'soft' | 'hard' | null } | null;
        return {
          score: t.score,
          migrated: t.migrated,
          launchDate: new Date(t.launch_date),
          athMarketCap: t.ath_market_cap || undefined,
          status: t.status as 'active' | 'inactive' | 'rug',
          rugSeverity: metadata?.rug_severity || (t.status === 'rug' ? 'soft' : null),
        };
      }),
      walletCount: 1, // Simplified - count wallets separately if needed
      accountCreatedAt: new Date(user.created_at),
    });

    if (OPTIONS.dryRun) {
      console.log(`    [DRY RUN] Would update ${user.twitter_handle}: ${user.total_score} -> ${devScore.score} (${devScore.tier})`);
      return;
    }

    // Update user score
    await pool.query(
      'UPDATE dk_users SET total_score = $1, tier = $2, updated_at = NOW() WHERE id = $3',
      [devScore.score, devScore.tier, user.id]
    );

    // Add to score history
    await pool.query(
      `INSERT INTO dk_score_history (user_id, score, score_breakdown)
       VALUES ($1, $2, $3)`,
      [user.id, devScore.score, JSON.stringify(devScore.breakdown)]
    ).catch(() => {}); // Ignore history errors

    console.log(`    ✓ ${user.twitter_handle}: ${user.total_score} -> ${devScore.score} (${devScore.tier})`);
    stats.scoresUpdated++;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`    ✗ ${user.twitter_handle}: ${message}`);
    stats.errors++;
  }
}

/**
 * Main backfill process
 */
async function runBackfill() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           DevKarma Database Backfill Script               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  
  if (OPTIONS.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made to the database');
    console.log('');
  }

  console.log('Options:');
  console.log(`  - Wallets only: ${OPTIONS.walletsOnly}`);
  console.log(`  - Enrich only: ${OPTIONS.enrichOnly}`);
  console.log(`  - Scores only: ${OPTIONS.scoresOnly}`);
  console.log(`  - With rug detection: ${OPTIONS.withRugDetection}`);
  console.log(`  - Skip whales: ${OPTIONS.skipWhales} (max ${OPTIONS.maxTokensPerWallet} tokens)`);
  console.log(`  - Specific wallet: ${OPTIONS.specificWallet || 'None'}`);
  console.log(`  - Limit: ${OPTIONS.limit || 'None'}`);
  console.log('');

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Scan wallets for new tokens
  // ─────────────────────────────────────────────────────────────
  if (!OPTIONS.enrichOnly && !OPTIONS.scoresOnly) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 1: Scanning wallets for new tokens...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let walletsQuery = 'SELECT id, user_id, address FROM dk_wallets ORDER BY created_at ASC';
    const queryParams: (string | number)[] = [];

    if (OPTIONS.specificWallet) {
      walletsQuery = 'SELECT id, user_id, address FROM dk_wallets WHERE address = $1';
      queryParams.push(OPTIONS.specificWallet);
    } else if (OPTIONS.limit) {
      walletsQuery += ' LIMIT $1';
      queryParams.push(OPTIONS.limit);
    }

    const walletsResult = await pool.query<WalletRow>(walletsQuery, queryParams);
    const wallets = walletsResult.rows;
    console.log(`Found ${wallets.length} wallets to scan`);
    console.log('');

    for (let i = 0; i < wallets.length; i++) {
      console.log(`[${i + 1}/${wallets.length}]`);
      const newTokens = await scanWalletForNewTokens(wallets[i]);
      stats.newTokensFound += newTokens;
      stats.walletsScanned++;

      // Rate limiting - wait between wallets
      await new Promise(r => setTimeout(r, 1000));
    }
    console.log('');
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: Enrich existing tokens
  // ─────────────────────────────────────────────────────────────
  if (!OPTIONS.walletsOnly && !OPTIONS.scoresOnly) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 2: Enriching tokens with market data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let tokensQuery = 'SELECT * FROM dk_tokens ORDER BY launch_date DESC';
    const queryParams: (string | number)[] = [];

    if (OPTIONS.specificWallet) {
      tokensQuery = 'SELECT * FROM dk_tokens WHERE creator_wallet = $1 ORDER BY launch_date DESC';
      queryParams.push(OPTIONS.specificWallet);
    } else if (OPTIONS.limit) {
      tokensQuery += ' LIMIT $1';
      queryParams.push(OPTIONS.limit * 10); // Assume ~10 tokens per wallet
    }

    const tokensResult = await pool.query<TokenRow>(tokensQuery, queryParams);
    const tokens = tokensResult.rows;
    console.log(`Found ${tokens.length} tokens to enrich`);
    console.log('');

    for (let i = 0; i < tokens.length; i++) {
      if (i % 10 === 0) {
        console.log(`  Progress: ${i}/${tokens.length} tokens`);
      }
      await enrichToken(tokens[i]);

      // Rate limiting - wait between API calls
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('');
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 3: Recalculate dev scores
  // ─────────────────────────────────────────────────────────────
  if (!OPTIONS.walletsOnly) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 3: Recalculating dev scores...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let usersQuery = `
      SELECT DISTINCT u.id, u.twitter_handle, u.total_score, u.created_at
      FROM dk_users u
      INNER JOIN dk_wallets w ON u.id = w.user_id
      ORDER BY u.total_score DESC
    `;
    const queryParams: (string | number)[] = [];

    if (OPTIONS.specificWallet) {
      usersQuery = `
        SELECT DISTINCT u.id, u.twitter_handle, u.total_score, u.created_at
        FROM dk_users u
        INNER JOIN dk_wallets w ON u.id = w.user_id
        WHERE w.address = $1
      `;
      queryParams.push(OPTIONS.specificWallet);
    } else if (OPTIONS.limit) {
      usersQuery += ' LIMIT $1';
      queryParams.push(OPTIONS.limit);
    }

    const usersResult = await pool.query<UserRow>(usersQuery, queryParams);
    const users = usersResult.rows;
    console.log(`Found ${users.length} users to recalculate`);
    console.log('');

    for (let i = 0; i < users.length; i++) {
      console.log(`[${i + 1}/${users.length}]`);
      await recalculateUserScore(users[i]);
    }
    console.log('');
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 4: Update ranks
  // ─────────────────────────────────────────────────────────────
  if (!OPTIONS.dryRun) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('PHASE 4: Updating ranks...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
    console.log('  ✓ Ranks updated');
    console.log('');
  }

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    Backfill Complete                      ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Wallets scanned:    ${String(stats.walletsScanned).padStart(6)}                           ║`);
  console.log(`║  New tokens found:   ${String(stats.newTokensFound).padStart(6)}                           ║`);
  console.log(`║  Tokens enriched:    ${String(stats.tokensEnriched).padStart(6)}                           ║`);
  console.log(`║  Scores updated:     ${String(stats.scoresUpdated).padStart(6)}                           ║`);
  console.log(`║  Errors:             ${String(stats.errors).padStart(6)}                           ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝');

  await pool.end();
}

// Run the backfill
runBackfill().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
