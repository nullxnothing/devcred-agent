import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const MINT = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump';

async function main() {
  // Check if token exists
  const result = await pool.query(
    'SELECT * FROM dk_tokens WHERE mint_address = $1',
    [MINT]
  );

  if (result.rows.length > 0) {
    console.log('Token found:', JSON.stringify(result.rows[0], null, 2));
  } else {
    console.log('Token not found in database');
    console.log('You may need to add it manually or trigger a rescan');
  }

  await pool.end();
}

main();
