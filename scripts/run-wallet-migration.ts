import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Running wallet-first auth migration...');
  
  try {
    // Step 1: Add primary_wallet column if it doesn't exist
    const colCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'dk_users' AND column_name = 'primary_wallet'
    `);
    
    if (colCheck.rows.length === 0) {
      console.log('Adding primary_wallet column...');
      await pool.query('ALTER TABLE dk_users ADD COLUMN primary_wallet VARCHAR(64)');
      console.log('✓ Added primary_wallet column');
    } else {
      console.log('✓ primary_wallet column already exists');
    }
    
    // Step 2: Make twitter_id nullable
    console.log('Making twitter_id nullable...');
    await pool.query('ALTER TABLE dk_users ALTER COLUMN twitter_id DROP NOT NULL').catch(() => {
      console.log('  (twitter_id already nullable or constraint does not exist)');
    });
    
    // Step 3: Make twitter_handle nullable
    console.log('Making twitter_handle nullable...');
    await pool.query('ALTER TABLE dk_users ALTER COLUMN twitter_handle DROP NOT NULL').catch(() => {
      console.log('  (twitter_handle already nullable or constraint does not exist)');
    });
    
    // Step 4: Drop unique constraints if they exist
    console.log('Dropping unique constraints...');
    await pool.query('ALTER TABLE dk_users DROP CONSTRAINT IF EXISTS dk_users_twitter_id_key');
    await pool.query('ALTER TABLE dk_users DROP CONSTRAINT IF EXISTS dk_users_twitter_handle_key');
    
    // Step 5: Create partial unique indexes (allow multiple NULLs)
    console.log('Creating partial unique indexes...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS dk_users_twitter_id_unique 
      ON dk_users (twitter_id) 
      WHERE twitter_id IS NOT NULL
    `);
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS dk_users_twitter_handle_unique 
      ON dk_users (twitter_handle) 
      WHERE twitter_handle IS NOT NULL
    `);
    
    // Step 6: Create unique index on primary_wallet
    console.log('Creating unique index on primary_wallet...');
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS dk_users_primary_wallet_unique 
      ON dk_users (primary_wallet) 
      WHERE primary_wallet IS NOT NULL
    `);
    
    // Step 7: Backfill primary_wallet from dk_wallets for existing users
    console.log('Backfilling primary_wallet for existing users...');
    const backfillResult = await pool.query(`
      UPDATE dk_users u 
      SET primary_wallet = (
        SELECT address FROM dk_wallets w 
        WHERE w.user_id = u.id AND w.is_primary = true
        LIMIT 1
      )
      WHERE u.primary_wallet IS NULL
    `);
    console.log(`✓ Backfilled ${backfillResult.rowCount} users`);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
