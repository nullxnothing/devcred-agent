import { pool } from '../lib/db';

async function migrate() {
  console.log('Adding scraped stats columns to dk_users...');

  try {
    await pool.query(`
      ALTER TABLE dk_users
      ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS migration_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rug_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS top_mcap NUMERIC
    `);

    console.log('Migration complete: scraped stats columns added');

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'dk_users'
      AND column_name IN ('token_count', 'migration_count', 'rug_count', 'top_mcap')
      ORDER BY column_name
    `);

    console.log('Verified columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrate();
