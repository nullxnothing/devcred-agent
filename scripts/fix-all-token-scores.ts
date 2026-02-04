/**
 * Fix all token scores in the database
 *
 * This script:
 * 1. Re-fetches market data for all tokens (updates ATH market cap)
 * 2. Re-checks migration status with new $10K liquidity threshold
 * 3. Recalculates token scores with updated scoring logic
 * 4. Recalculates dev scores for all affected users
 *
 * Run: npx tsx scripts/fix-all-token-scores.ts
 * Run with --fix to actually update: npx tsx scripts/fix-all-token-scores.ts --fix
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import { batchGetTokenMarketData } from '../lib/dexscreener';
import { batchDetectMigrations } from '../lib/migration-detection';
import { batchGetHolderCountsQuick } from '../lib/helius';
import { calculateTokenScore, calculateDevScore, getTierInfo } from '../lib/scoring';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface TokenRow {
  id: string;
  mint_address: string;
  name: string;
  symbol: string;
  creator_wallet: string;
  user_id: string;
  launch_date: string;
  migrated: boolean;
  ath_market_cap: string | null;
  current_market_cap: string | null;
  holder_count: number | null;
  status: string;
  score: number;
  rug_severity: 'soft' | 'hard' | null;
}

interface UserRow {
  id: string;
  primary_wallet: string;
  total_score: number;
  tier: string;
}

const isDryRun = !process.argv.includes('--fix');
const BATCH_SIZE = 30; // DexScreener batch size limit

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fixAllTokenScores() {
  console.log(isDryRun ? '=== DRY RUN MODE ===' : '=== FIXING TOKEN SCORES ===');
  console.log('');

  // Step 1: Get all tokens
  console.log('Step 1: Fetching all tokens from database...');
  const tokensResult = await pool.query<TokenRow>(`
    SELECT id, mint_address, name, symbol, creator_wallet, user_id,
           launch_date, migrated, ath_market_cap, current_market_cap,
           holder_count, status, score, rug_severity
    FROM dk_tokens
    ORDER BY launch_date DESC
  `);

  const tokens = tokensResult.rows;
  console.log(`Found ${tokens.length} tokens\n`);

  if (tokens.length === 0) {
    console.log('No tokens to process');
    await pool.end();
    return;
  }

  // Step 2: Process tokens in batches
  console.log('Step 2: Fetching fresh market data and migration status...');

  const updatedTokens: Map<string, {
    newScore: number;
    newMigrated: boolean;
    newAthMarketCap: number;
    newCurrentMarketCap: number;
    newHolderCount: number;
    oldScore: number;
    oldMigrated: boolean;
  }> = new Map();

  const batches: TokenRow[][] = [];
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    batches.push(tokens.slice(i, i + BATCH_SIZE));
  }

  let processedTokens = 0;
  let migrationsChanged = 0;
  let scoresChanged = 0;

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const mintAddresses = batch.map(t => t.mint_address);

    console.log(`  Processing batch ${batchIdx + 1}/${batches.length} (${mintAddresses.length} tokens)...`);

    try {
      // Fetch market data, migration status, and holder counts in parallel
      const [marketDataMap, migrationMap, holderCountsMap] = await Promise.all([
        batchGetTokenMarketData(mintAddresses),
        batchDetectMigrations(mintAddresses.map(m => ({ mint: m, wallet: batch.find(t => t.mint_address === m)?.creator_wallet || '' }))),
        batchGetHolderCountsQuick(mintAddresses),
      ]);

      // Process each token in batch
      for (const token of batch) {
        const market = marketDataMap.get(token.mint_address);
        const migration = migrationMap.get(token.mint_address);
        const holderCount = holderCountsMap.get(token.mint_address) || token.holder_count || 0;

        // Calculate new values
        const currentMcap = market?.marketCap || 0;
        const existingAth = parseFloat(token.ath_market_cap || '0') || 0;
        const existingCurrentMcap = parseFloat(token.current_market_cap || '0') || 0;
        const newAthMarketCap = Math.max(existingAth, currentMcap, existingCurrentMcap);

        // New migration status (uses $10K liquidity threshold)
        const newMigrated = migration?.migrated || false;
        const oldMigrated = token.migrated;

        // Calculate new token score
        const scoreResult = await calculateTokenScore({
          mintAddress: token.mint_address,
          creatorWallet: token.creator_wallet,
          launchDate: new Date(token.launch_date),
          isRugged: token.status === 'rug',
          rugSeverity: token.rug_severity,
          holderCount,
          marketData: market ? {
            mintAddress: token.mint_address,
            name: token.name,
            symbol: token.symbol,
            priceUsd: market.priceUsd ? parseFloat(market.priceUsd) : 0,
            priceChange24h: 0,
            volume24h: market.volume24h || 0,
            liquidity: market.liquidity || 0,
            marketCap: currentMcap,
            athMarketCap: newAthMarketCap,
            fdv: market.fdv || 0,
            totalBuys24h: 0,
            totalSells24h: 0,
            pairAddress: '',
            dexId: market.dexId || '',
            pairCreatedAt: market.pairCreatedAt ? new Date(market.pairCreatedAt) : new Date(token.launch_date),
            url: '',
            allPairs: [],
          } : null,
          migrationStatus: {
            migrated: newMigrated,
            migrationType: migration?.dexId as any || null,
            pool: null,
            liquidityUsd: migration?.liquidityUsd || market?.liquidity || 0,
            migratedAt: migration?.migratedAt || null,
          },
        });

        const newScore = scoreResult.score;
        const oldScore = token.score;

        // Track changes
        if (newMigrated !== oldMigrated) migrationsChanged++;
        if (Math.abs(newScore - oldScore) > 1) scoresChanged++;

        updatedTokens.set(token.mint_address, {
          newScore,
          newMigrated,
          newAthMarketCap,
          newCurrentMarketCap: currentMcap,
          newHolderCount: holderCount,
          oldScore,
          oldMigrated,
        });

        processedTokens++;
      }
    } catch (error) {
      console.error(`  Error processing batch ${batchIdx + 1}:`, error);
    }

    // Rate limiting
    await sleep(500);
  }

  console.log(`\nProcessed ${processedTokens} tokens`);
  console.log(`  Migration status changed: ${migrationsChanged}`);
  console.log(`  Scores changed: ${scoresChanged}`);

  // Step 3: Show changes and update database
  console.log('\nStep 3: Updating database...');

  if (isDryRun) {
    console.log('\n=== SAMPLE CHANGES (first 20) ===');
    let shown = 0;
    for (const [mint, data] of updatedTokens) {
      if (shown >= 20) break;

      const migChanged = data.newMigrated !== data.oldMigrated;
      const scoreChanged = Math.abs(data.newScore - data.oldScore) > 1;

      if (migChanged || scoreChanged) {
        const token = tokens.find(t => t.mint_address === mint);
        console.log(`${token?.symbol || mint.slice(0, 8)}:`);
        if (migChanged) {
          console.log(`  Migration: ${data.oldMigrated} → ${data.newMigrated}`);
        }
        if (scoreChanged) {
          console.log(`  Score: ${data.oldScore} → ${data.newScore}`);
        }
        console.log(`  ATH MCap: $${data.newAthMarketCap.toLocaleString()}`);
        shown++;
      }
    }
  } else {
    // Actually update tokens
    let updated = 0;
    for (const [mint, data] of updatedTokens) {
      try {
        await pool.query(`
          UPDATE dk_tokens SET
            score = $1,
            migrated = $2,
            ath_market_cap = GREATEST(COALESCE(ath_market_cap, 0), $3),
            current_market_cap = $4,
            holder_count = $5,
            updated_at = NOW()
          WHERE mint_address = $6
        `, [
          data.newScore,
          data.newMigrated,
          data.newAthMarketCap,
          data.newCurrentMarketCap,
          data.newHolderCount,
          mint,
        ]);
        updated++;
      } catch (error) {
        console.error(`Failed to update ${mint}:`, error);
      }
    }
    console.log(`Updated ${updated} tokens`);
  }

  // Step 4: Recalculate dev scores
  console.log('\nStep 4: Recalculating dev scores...');

  const usersResult = await pool.query<UserRow>(`
    SELECT DISTINCT u.id, u.primary_wallet, u.total_score, u.tier
    FROM dk_users u
    INNER JOIN dk_wallets w ON u.id = w.user_id
    WHERE u.total_score IS NOT NULL
  `);

  const users = usersResult.rows;
  console.log(`Found ${users.length} users to recalculate`);

  let usersUpdated = 0;
  for (const user of users) {
    try {
      // Get all tokens for this user
      const userTokensResult = await pool.query<TokenRow>(`
        SELECT * FROM dk_tokens WHERE user_id = $1
      `, [user.id]);

      const userTokens = userTokensResult.rows;
      if (userTokens.length === 0) continue;

      // Calculate dev score
      const devScoreResult = calculateDevScore({
        tokens: userTokens.map(t => ({
          score: t.score,
          migrated: t.migrated,
          launchDate: new Date(t.launch_date),
          athMarketCap: parseFloat(t.ath_market_cap || '0') || undefined,
          status: t.status as 'active' | 'inactive' | 'rug',
          rugSeverity: t.rug_severity,
        })),
        walletCount: 1,
        accountCreatedAt: new Date(),
      });

      const oldScore = user.total_score;
      const newScore = devScoreResult.score;
      const newTier = devScoreResult.tier;

      if (Math.abs(newScore - oldScore) > 5) {
        if (isDryRun) {
          console.log(`  ${user.primary_wallet?.slice(0, 8) || user.id}: ${oldScore} → ${newScore} (${user.tier} → ${newTier})`);
        } else {
          await pool.query(`
            UPDATE dk_users SET total_score = $1, tier = $2, updated_at = NOW() WHERE id = $3
          `, [newScore, newTier, user.id]);
        }
        usersUpdated++;
      }
    } catch (error) {
      console.error(`Failed to update user ${user.id}:`, error);
    }
  }

  console.log(`${isDryRun ? 'Would update' : 'Updated'} ${usersUpdated} users`);

  // Step 5: Update ranks
  if (!isDryRun) {
    console.log('\nStep 5: Updating ranks...');
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
    console.log('Ranks updated');
  }

  console.log('\n=== COMPLETE ===');
  if (isDryRun) {
    console.log('Run with --fix to apply changes');
  }

  await pool.end();
}

// Run
fixAllTokenScores().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
