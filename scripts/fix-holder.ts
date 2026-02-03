import { config } from 'dotenv';
config();
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query('UPDATE dk_tokens SET holder_count = 800 WHERE mint_address = $1', ['2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump']);
  console.log('Updated holder count to 800');
  await pool.end();
}
main();
