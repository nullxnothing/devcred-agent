import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  console.log('Running dk_wallet_nonces migration...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dk_wallet_nonces (
        wallet_address VARCHAR(64) PRIMARY KEY,
        user_id UUID NOT NULL,
        nonce VARCHAR(64) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ Table created');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_nonces_expires ON dk_wallet_nonces(expires_at)
    `);
    console.log('✓ Index created');

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
