import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway'
});

async function wipe() {
  console.log('Wiping database...');

  // Truncate all tables
  await pool.query('TRUNCATE dk_tokens CASCADE');
  console.log('  - dk_tokens cleared');

  await pool.query('TRUNCATE dk_wallets CASCADE');
  console.log('  - dk_wallets cleared');

  await pool.query('TRUNCATE dk_users CASCADE');
  console.log('  - dk_users cleared');

  await pool.query('TRUNCATE dk_score_history CASCADE').catch(() => {});
  console.log('  - dk_score_history cleared');

  await pool.query('TRUNCATE dk_wallet_tokens_cache CASCADE').catch(() => {});
  console.log('  - dk_wallet_tokens_cache cleared');

  await pool.query('TRUNCATE dk_wallet_scan_cache CASCADE').catch(() => {});
  console.log('  - dk_wallet_scan_cache cleared');

  await pool.query('TRUNCATE dk_token_market_cache CASCADE').catch(() => {});
  console.log('  - dk_token_market_cache cleared');

  // Verify
  const users = await pool.query('SELECT COUNT(*) FROM dk_users');
  const wallets = await pool.query('SELECT COUNT(*) FROM dk_wallets');
  const tokens = await pool.query('SELECT COUNT(*) FROM dk_tokens');

  console.log('');
  console.log('Verification:');
  console.log('  Users:', users.rows[0].count);
  console.log('  Wallets:', wallets.rows[0].count);
  console.log('  Tokens:', tokens.rows[0].count);
  console.log('');
  console.log('Database wiped successfully!');

  await pool.end();
}

wipe().catch(e => { console.error('Error:', e); process.exit(1); });
