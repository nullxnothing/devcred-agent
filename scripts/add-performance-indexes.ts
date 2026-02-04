/**
 * Add performance indexes to database tables
 * Run with: npx tsx scripts/add-performance-indexes.ts
 */
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function addIndexes() {
  console.log('Adding performance indexes...\n');

  const indexes = [
    {
      name: 'idx_dk_users_primary_wallet',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_users_primary_wallet ON dk_users(primary_wallet)',
    },
    {
      name: 'idx_dk_wallets_user_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_wallets_user_id ON dk_wallets(user_id)',
    },
    {
      name: 'idx_dk_wallets_address',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_wallets_address ON dk_wallets(address)',
    },
    {
      name: 'idx_dk_tokens_creator_wallet',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_tokens_creator_wallet ON dk_tokens(creator_wallet)',
    },
    {
      name: 'idx_dk_tokens_user_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_tokens_user_id ON dk_tokens(user_id)',
    },
    {
      name: 'idx_dk_score_history_user_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_score_history_user_date ON dk_score_history(user_id, calculated_at DESC)',
    },
    {
      name: 'idx_dk_profile_views_user_date',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_profile_views_user_date ON dk_profile_views(user_id, viewed_at DESC)',
    },
    {
      name: 'idx_dk_kols_user_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_kols_user_id ON dk_kols(user_id)',
    },
    {
      name: 'idx_dk_users_twitter_handle_lower',
      sql: 'CREATE INDEX IF NOT EXISTS idx_dk_users_twitter_handle_lower ON dk_users(LOWER(twitter_handle))',
    },
  ];

  for (const index of indexes) {
    try {
      await pool.query(index.sql);
      console.log(`✓ ${index.name}`);
    } catch (error) {
      console.error(`✗ ${index.name}:`, (error as Error).message);
    }
  }

  console.log('\nDone!');
  await pool.end();
}

addIndexes().catch(console.error);
