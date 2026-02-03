import { config } from 'dotenv';
config();
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'dk_users'");
  console.log('dk_users columns:', r.rows.map(x => x.column_name).join(', '));
  await pool.end();
}
main();
