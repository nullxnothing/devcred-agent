import { config } from 'dotenv';
config();

import { Pool } from 'pg';
import { calculateDevScore, getTierInfo } from '../lib/scoring';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function recalcUserScore(handle: string) {
  // Get user
  const userResult = await pool.query(
    'SELECT * FROM dk_users WHERE LOWER(twitter_handle) = LOWER($1)',
    [handle]
  );
  const user = userResult.rows[0];
  if (!user) {
    console.log('User not found:', handle);
    return;
  }

  console.log('\nUser:', user.twitter_handle, '(id:', user.id, ')');
  console.log('Current score:', user.total_score);

  // Get wallets
  const walletResult = await pool.query(
    'SELECT * FROM dk_wallets WHERE user_id = $1',
    [user.id]
  );
  const wallets = walletResult.rows;
  console.log('Wallets:', wallets.length);

  // Get tokens (via user_id or creator_wallet matching wallets)
  const tokenResult = await pool.query(
    `SELECT * FROM dk_tokens WHERE user_id = $1
     OR creator_wallet IN (SELECT address FROM dk_wallets WHERE user_id = $1)`,
    [user.id]
  );
  const tokens = tokenResult.rows;
  console.log('Tokens:', tokens.length);

  if (tokens.length === 0) {
    console.log('No tokens found');
    await pool.end();
    return;
  }

  // Show token details
  for (const t of tokens) {
    console.log(`  - ${t.name} (${t.symbol}): score=${t.score}, migrated=${t.migrated}, ATH=${t.ath_market_cap || 'N/A'}`);
  }

  // Calculate dev score
  const devScore = calculateDevScore({
    tokens: tokens.map((t) => ({
      score: Number(t.score) || 0,
      migrated: t.migrated || false,
      launchDate: new Date(t.launch_date || t.created_at),
      athMarketCap: t.ath_market_cap ? Number(t.ath_market_cap) : undefined,
      status: t.status as 'active' | 'inactive' | 'rug',
      rugSeverity: t.rug_severity as 'soft' | 'hard' | null,
    })),
    walletCount: wallets.length,
    accountCreatedAt: new Date(user.created_at),
  });

  console.log('\n--- NEW SCORE BREAKDOWN ---');
  console.log('Base score:', devScore.breakdown.baseScore);
  console.log('Migration bonus:', devScore.breakdown.migrationBonus);
  console.log('Market cap bonus:', devScore.breakdown.marketCapBonus);
  console.log('Rug penalties:', devScore.breakdown.rugPenalties);
  console.log('TOTAL:', devScore.score);
  console.log('Tier:', getTierInfo(devScore.tier).name);

  // Update user
  await pool.query(
    'UPDATE dk_users SET total_score = $1, tier = $2, updated_at = NOW() WHERE id = $3',
    [devScore.score, devScore.tier, user.id]
  );

  console.log('\nUpdated user score from', user.total_score, 'to', devScore.score);

  await pool.end();
}

const handle = process.argv[2];
if (!handle) {
  console.log('Usage: npx tsx scripts/recalc-user-score.ts <handle>');
  process.exit(1);
}

recalcUserScore(handle);
