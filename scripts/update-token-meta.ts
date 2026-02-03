import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query(
    `UPDATE dk_tokens
     SET name = 'Blink-402',
         symbol = 'B402',
         current_market_cap = 5306
     WHERE mint_address = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump'
     RETURNING *`
  );

  if (result.rows.length > 0) {
    console.log('Updated token:');
    console.log(`  Name: ${result.rows[0].name}`);
    console.log(`  Symbol: ${result.rows[0].symbol}`);
    console.log(`  Market Cap: ${result.rows[0].current_market_cap}`);
  } else {
    console.log('Token not found');
  }

  await pool.end();
}

main();
