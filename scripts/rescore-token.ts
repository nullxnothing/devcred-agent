import { config } from 'dotenv';
config();

import { Pool } from 'pg';
import { estimateTokenScore } from '../lib/scoring';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function rescoreToken(mintAddress: string) {
  const result = await pool.query(
    'SELECT * FROM dk_tokens WHERE mint_address = $1',
    [mintAddress]
  );
  const token = result.rows[0];
  if (!token) {
    console.log('Token not found:', mintAddress);
    await pool.end();
    return;
  }

  console.log('\nToken:', token.name, '(', token.symbol, ')');
  console.log('Mint:', token.mint_address);
  console.log('Current score:', token.score);
  console.log('Migrated:', token.migrated);
  console.log('ATH Market Cap:', token.ath_market_cap);
  console.log('Holder Count:', token.holder_count);
  console.log('Launch Date:', token.launch_date);

  const daysOld = token.launch_date
    ? Math.floor((Date.now() - new Date(token.launch_date).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  const newScore = estimateTokenScore({
    migrated: token.migrated || false,
    marketCap: Number(token.ath_market_cap) || Number(token.current_market_cap) || 0,
    holderCount: token.holder_count || 0,
    daysOld,
    isRugged: token.status === 'rug',
  });

  console.log('\n--- SCORE BREAKDOWN ---');
  console.log('Days old:', daysOld);
  console.log('OLD score:', token.score);
  console.log('NEW score:', newScore);

  await pool.query(
    'UPDATE dk_tokens SET score = $1, updated_at = NOW() WHERE mint_address = $2',
    [newScore, mintAddress]
  );

  console.log('\nUpdated token score from', token.score, 'to', newScore);
  await pool.end();
}

const mint = process.argv[2];
if (!mint) {
  console.log('Usage: npx tsx scripts/rescore-token.ts <mint_address>');
  process.exit(1);
}

rescoreToken(mint);
