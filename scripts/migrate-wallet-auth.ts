/**
 * Run wallet-first auth migration
 * This migrates the database to support wallet as primary identity
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  console.log('Running wallet-first auth migration...\n');

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/005_wallet_primary_auth.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons but keep comments together with their statements
    const statements = migration
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log('Executing:', statement.substring(0, 60) + '...');
        await pool.query(statement);
        console.log('✓ Done\n');
      }
    }

    // Verify migration
    const result = await pool.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dk_users' 
      AND column_name IN ('twitter_id', 'twitter_handle', 'primary_wallet')
      ORDER BY column_name
    `);

    console.log('\n=== Migration Verification ===');
    console.log('dk_users columns:');
    for (const row of result.rows) {
      console.log(`  ${row.column_name}: ${row.data_type}, nullable: ${row.is_nullable}`);
    }

    // Count users with/without primary wallet
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(primary_wallet) as users_with_wallet,
        COUNT(*) FILTER (WHERE twitter_id IS NOT NULL AND twitter_id != '') as users_with_twitter
      FROM dk_users
    `);

    console.log('\nUser stats:');
    const stats = statsResult.rows[0];
    console.log(`  Total users: ${stats.total_users}`);
    console.log(`  Users with wallet: ${stats.users_with_wallet}`);
    console.log(`  Users with Twitter: ${stats.users_with_twitter}`);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
