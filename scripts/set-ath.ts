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
     SET ath_market_cap = 500000
     WHERE mint_address = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump'
     RETURNING name, symbol, ath_market_cap, current_market_cap`
  );

  console.log('Updated token:');
  console.log(`  Name: ${result.rows[0].name}`);
  console.log(`  Symbol: ${result.rows[0].symbol}`);
  console.log(`  ATH Market Cap: $${(result.rows[0].ath_market_cap / 1000).toFixed(0)}K`);
  console.log(`  Current Market Cap: $${result.rows[0].current_market_cap}`);

  await pool.end();
}

main();
