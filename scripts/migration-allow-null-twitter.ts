import { Pool } from 'pg';
import 'dotenv/config';

async function migrate() {
  console.log('Running migration: ALLOW NULL twitter_id for dk_users');
  
  // Try direct connection host
  const projectRef = 'ptpfalwptrvigoljpcjk';
  const password = 'RgBaWsSUizI4TOUV';
  const directUrl = `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`;

  console.log(`Trying direct connection to ${projectRef}...`);
  
  const pool = new Pool({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const res = await pool.query('ALTER TABLE dk_users ALTER COLUMN twitter_id DROP NOT NULL;');
    console.log('Migration successful!', res.command);
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    if (error.hint) console.log('Hint:', error.hint);
  } finally {
    await pool.end();
  }
}

migrate();
