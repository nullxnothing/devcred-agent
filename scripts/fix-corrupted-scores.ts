/**
 * Fix corrupted scores in the database
 *
 * Problem: Simplified scoring formulas were used that didn't match lib/scoring.ts
 * Solution: Recalculate scores using the proper calculateDevScoreFromAggregate()
 *
 * Run: npx tsx scripts/fix-corrupted-scores.ts
 * Run with --fix to actually update: npx tsx scripts/fix-corrupted-scores.ts --fix
 */

import { Pool } from 'pg';
import { calculateDevScoreFromAggregate } from '../lib/scoring';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface AggregateRow {
  user_id: string;
  primary_wallet: string;
  total_score: number;
  tier: string;
  token_count: string;
  migration_count: string;
  top_mcap: string;
  rug_count: string;
}

async function fixCorruptedScores() {
  console.log('Starting score correction...\n');

  // Join users with aggregated token data
  const result = await pool.query<AggregateRow>(`
    SELECT
      u.id as user_id,
      u.primary_wallet,
      u.total_score,
      u.tier,
      COALESCE(t.token_count, 0) as token_count,
      COALESCE(t.migration_count, 0) as migration_count,
      COALESCE(t.top_mcap, 0) as top_mcap,
      COALESCE(t.rug_count, 0) as rug_count
    FROM dk_users u
    LEFT JOIN (
      SELECT
        creator_wallet,
        COUNT(*) as token_count,
        SUM(CASE WHEN migrated THEN 1 ELSE 0 END) as migration_count,
        MAX(COALESCE(ath_market_cap, 0)) as top_mcap,
        SUM(CASE WHEN status = 'rug' THEN 1 ELSE 0 END) as rug_count
      FROM dk_tokens
      GROUP BY creator_wallet
    ) t ON u.primary_wallet = t.creator_wallet
    WHERE u.total_score IS NOT NULL
    ORDER BY t.migration_count DESC NULLS LAST, u.total_score DESC
    LIMIT 500
  `);

  console.log(`Found ${result.rows.length} users to check\n`);

  let fixed = 0;
  let unchanged = 0;
  let errors = 0;

  for (const user of result.rows) {
    try {
      const tokenCount = parseInt(user.token_count) || 0;
      const migrationCount = parseInt(user.migration_count) || 0;
      const topMcap = parseFloat(user.top_mcap) || 0;
      const rugCount = parseInt(user.rug_count) || 0;

      // Recalculate using proper algorithm
      const scoreResult = calculateDevScoreFromAggregate({
        tokenCount,
        migrationCount,
        topMcap,
        rugCount,
      });

      const newScore = scoreResult.score;
      const newTier = scoreResult.tier;
      const oldScore = parseFloat(String(user.total_score)) || 0;

      // Check if score changed significantly (more than 5 points)
      const scoreDiff = Math.abs(newScore - oldScore);
      if (scoreDiff > 5) {
        const wallet = user.primary_wallet || 'unknown';
        console.log(`[FIX] ${wallet.slice(0, 8)}...`);
        console.log(`  Tokens: ${tokenCount}, Migrations: ${migrationCount}, TopMcap: $${topMcap.toLocaleString()}, Rugs: ${rugCount}`);
        console.log(`  Old: ${oldScore} (${user.tier}) → New: ${newScore} (${newTier})`);
        console.log('');

        // Update database
        await pool.query(
          `UPDATE dk_users SET total_score = $1, tier = $2, updated_at = NOW() WHERE id = $3`,
          [newScore, newTier, user.user_id]
        );
        fixed++;
      } else {
        unchanged++;
      }
    } catch (error) {
      console.error(`[ERROR] Failed to fix user ${user.user_id}:`, error);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Fixed: ${fixed}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Errors: ${errors}`);

  await pool.end();
}

// Dry run mode - just show what would change
async function dryRun() {
  console.log('=== DRY RUN MODE ===\n');

  const result = await pool.query<AggregateRow>(`
    SELECT
      u.id as user_id,
      u.primary_wallet,
      u.total_score,
      u.tier,
      COALESCE(t.token_count, 0) as token_count,
      COALESCE(t.migration_count, 0) as migration_count,
      COALESCE(t.top_mcap, 0) as top_mcap,
      COALESCE(t.rug_count, 0) as rug_count
    FROM dk_users u
    LEFT JOIN (
      SELECT
        creator_wallet,
        COUNT(*) as token_count,
        SUM(CASE WHEN migrated THEN 1 ELSE 0 END) as migration_count,
        MAX(COALESCE(ath_market_cap, 0)) as top_mcap,
        SUM(CASE WHEN status = 'rug' THEN 1 ELSE 0 END) as rug_count
      FROM dk_tokens
      GROUP BY creator_wallet
    ) t ON u.primary_wallet = t.creator_wallet
    WHERE u.total_score IS NOT NULL AND u.total_score > 0
    ORDER BY t.migration_count DESC NULLS LAST, u.total_score DESC
    LIMIT 30
  `);

  console.log(`Checking ${result.rows.length} users with scores...\n`);

  let wouldFix = 0;
  for (const user of result.rows) {
    const tokenCount = parseInt(user.token_count) || 0;
    const migrationCount = parseInt(user.migration_count) || 0;
    const topMcap = parseFloat(user.top_mcap) || 0;
    const rugCount = parseInt(user.rug_count) || 0;

    const scoreResult = calculateDevScoreFromAggregate({
      tokenCount,
      migrationCount,
      topMcap,
      rugCount,
    });

    const newScore = scoreResult.score;
    const newTier = scoreResult.tier;
    const oldScore = parseFloat(String(user.total_score)) || 0;
    const scoreDiff = newScore - oldScore;

    if (Math.abs(scoreDiff) > 5) {
      const wallet = user.primary_wallet || 'unknown';
      console.log(`${wallet.slice(0, 8)}...`);
      console.log(`  Data: ${tokenCount} tokens, ${migrationCount} migrations, $${topMcap.toLocaleString()} mcap, ${rugCount} rugs`);
      console.log(`  Score: ${oldScore} → ${newScore} (${scoreDiff > 0 ? '+' : ''}${scoreDiff})`);
      console.log(`  Tier: ${user.tier} → ${newTier}`);
      console.log('');
      wouldFix++;
    }
  }

  console.log(`\nWould fix ${wouldFix} users. Run with --fix to apply changes.`);
  await pool.end();
}

// Run
const args = process.argv.slice(2);
if (args.includes('--fix')) {
  fixCorruptedScores().catch(console.error);
} else {
  console.log('Run with --fix to actually update the database\n');
  dryRun().catch(console.error);
}
