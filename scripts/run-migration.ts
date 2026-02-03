import { Pool } from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Connecting to database...');

  const sql = fs.readFileSync('./supabase/migrations/004_add_kols.sql', 'utf8');

  try {
    await pool.query(sql);
    console.log('Migration successful: dk_kols table created');
  } catch (err: unknown) {
    const pgError = err as { code?: string; message?: string };
    if (pgError.code === '42P07') {
      console.log('Table dk_kols already exists');
    } else {
      console.error('Migration error:', pgError.message);
      throw err;
    }
  } finally {
    await pool.end();
  }
}

runMigration();
