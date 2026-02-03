import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway'
});

async function run() {
  try {
    console.log('Adding tier column to dk_users...');
    await pool.query(`ALTER TABLE dk_users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'unverified'`);
    console.log('Column added successfully');

    const result = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dk_users'`);
    console.log('Current columns in dk_users:');
    result.rows.forEach(row => console.log(`  - ${row.column_name}: ${row.data_type}`));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await pool.end();
  }
}

run();
