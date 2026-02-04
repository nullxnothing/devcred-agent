import { pool } from '../lib/db';

async function migrate() {
  console.log('Adding scraped_at column to dk_users...');

  try {
    await pool.query(`
      ALTER TABLE dk_users
      ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ
    `);

    console.log('Migration complete: scraped_at column added');

    // Check current state
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'dk_users' AND column_name = 'scraped_at'
    `);

    if (result.rows.length > 0) {
      console.log('Verified: scraped_at column exists with type', result.rows[0].data_type);
    } else {
      console.error('Warning: Column not found after migration');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
