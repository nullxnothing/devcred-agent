import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query(`
    SELECT t.mint_address, t.name, t.symbol
    FROM dk_tokens t
    INNER JOIN dk_wallets w ON t.creator_wallet = w.address
    INNER JOIN dk_users u ON w.user_id = u.id
    WHERE LOWER(u.twitter_handle) = LOWER('kaelxsol')
  `);

  console.log('Tokens for kaelxsol:');
  result.rows.forEach(t => {
    console.log(`  - ${t.symbol} (${t.name}): ${t.mint_address}`);
  });
  console.log(`Total: ${result.rows.length}`);

  await pool.end();
}

main();
