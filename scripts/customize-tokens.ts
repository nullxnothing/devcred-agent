/**
 * Script to customize which tokens show for a specific user
 * Usage: npx tsx scripts/customize-tokens.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const TARGET_HANDLE = 'kaelxsol';
const KEEP_MINT = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump';

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

    // Get their wallets
    const walletsResult = await pool.query(
      'SELECT address FROM dk_wallets WHERE user_id = $1',
      [user.id]
    );

    const walletAddresses = walletsResult.rows.map(w => w.address);
    console.log(`Wallets: ${walletAddresses.join(', ')}`);

    // Get current tokens
    const tokensResult = await pool.query(
      'SELECT mint_address, name, symbol FROM dk_tokens WHERE creator_wallet = ANY($1)',
      [walletAddresses]
    );

    console.log(`\nCurrent tokens (${tokensResult.rows.length}):`);
    tokensResult.rows.forEach(t => {
      const keep = t.mint_address === KEEP_MINT ? ' [KEEP]' : ' [DELETE]';
      console.log(`  - ${t.symbol} (${t.name}): ${t.mint_address}${keep}`);
    });

    // Delete all tokens except the one we want to keep
    const deleteResult = await pool.query(
      'DELETE FROM dk_tokens WHERE creator_wallet = ANY($1) AND mint_address != $2',
      [walletAddresses, KEEP_MINT]
    );

    console.log(`\nDeleted ${deleteResult.rowCount} tokens`);

    // Verify
    const remainingResult = await pool.query(
      'SELECT mint_address, name, symbol FROM dk_tokens WHERE creator_wallet = ANY($1)',
      [walletAddresses]
    );

    console.log(`\nRemaining tokens (${remainingResult.rows.length}):`);
    remainingResult.rows.forEach(t => {
      console.log(`  - ${t.symbol} (${t.name}): ${t.mint_address}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
