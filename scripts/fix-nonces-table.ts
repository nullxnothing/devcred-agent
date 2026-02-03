import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixNoncesTable() {
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'dk_wallet_nonces'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('Creating dk_wallet_nonces table...');
      await pool.query(`
        CREATE TABLE dk_wallet_nonces (
          wallet_address VARCHAR(64) PRIMARY KEY,
          user_id UUID,
          nonce VARCHAR(64) NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log('✓ Created dk_wallet_nonces table');
    } else {
      console.log('Table exists, checking user_id nullable...');
      
      // Check if user_id is nullable
      const colCheck = await pool.query(`
        SELECT is_nullable FROM information_schema.columns 
        WHERE table_name = 'dk_wallet_nonces' AND column_name = 'user_id'
      `);
      
      if (colCheck.rows.length > 0 && colCheck.rows[0].is_nullable === 'NO') {
        console.log('Making user_id nullable...');
        await pool.query('ALTER TABLE dk_wallet_nonces ALTER COLUMN user_id DROP NOT NULL');
        console.log('✓ user_id is now nullable');
      } else {
        console.log('✓ user_id is already nullable');
      }
    }
    
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixNoncesTable();
