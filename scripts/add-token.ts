import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_HANDLE = 'kaelxsol';
const TOKEN_MINT = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump';

async function main() {
  try {
    // Get user
    const userResult = await pool.query(
      'SELECT * FROM dk_users WHERE LOWER(twitter_handle) = LOWER($1)',
      [TARGET_HANDLE]
    );

    if (userResult.rows.length === 0) {
      console.log(`User ${TARGET_HANDLE} not found`);
      return;
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.twitter_name} (${user.id})`);

    // Get their wallet
    const walletsResult = await pool.query(
      'SELECT address FROM dk_wallets WHERE user_id = $1 AND is_primary = true',
      [user.id]
    );

    if (walletsResult.rows.length === 0) {
      console.log('No primary wallet found');
      return;
    }

    const walletAddress = walletsResult.rows[0].address;
    console.log(`Primary wallet: ${walletAddress}`);

    // Add the token with basic info (will be enriched on profile view)
    const insertResult = await pool.query(
      `INSERT INTO dk_tokens (
        mint_address, name, symbol, creator_wallet, user_id, launch_date,
        migrated, status, score
      ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
      ON CONFLICT (mint_address) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        creator_wallet = EXCLUDED.creator_wallet
      RETURNING *`,
      [
        TOKEN_MINT,
        'X402',  // Token name - update if needed
        'X402',  // Token symbol - update if needed
        walletAddress,
        user.id,
        true,   // migrated
        'active',
        50      // base score
      ]
    );

    console.log('\nToken added:', JSON.stringify(insertResult.rows[0], null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
