import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway'
});

const wallet = process.argv[2] || 'DXRYr9kFH7WSRztkZ8rm9ycK9Xu7V6q222pAL74oXktv';

async function check() {
  console.log('Checking database for wallet:', wallet);
  console.log('');

  // Check if wallet exists in dk_wallets
  const walletResult = await pool.query(
    'SELECT * FROM dk_wallets WHERE address = $1',
    [wallet]
  );

  if (walletResult.rows.length > 0) {
    console.log('WALLET FOUND IN dk_wallets:');
    console.log('  ID:', walletResult.rows[0].id);
    console.log('  User ID:', walletResult.rows[0].user_id);
    console.log('  Created:', walletResult.rows[0].created_at);

    // Get user info
    const userResult = await pool.query(
      'SELECT * FROM dk_users WHERE id = $1',
      [walletResult.rows[0].user_id]
    );
    if (userResult.rows.length > 0) {
      console.log('');
      console.log('LINKED USER:');
      console.log('  Handle:', userResult.rows[0].twitter_handle);
      console.log('  Score:', userResult.rows[0].total_score);
      console.log('  Tier:', userResult.rows[0].tier);
    }
  } else {
    console.log('Wallet NOT found in dk_wallets (not linked to any user)');
  }

  console.log('');

  // Check tokens for this wallet
  const tokensResult = await pool.query(
    'SELECT * FROM dk_tokens WHERE creator_wallet = $1',
    [wallet]
  );

  console.log('TOKENS IN DATABASE:', tokensResult.rows.length);

  const migrated = tokensResult.rows.filter(t => t.migrated === true);
  console.log('Migrated tokens:', migrated.length);

  if (migrated.length > 0) {
    console.log('');
    console.log('Migrated tokens list:');
    for (const token of migrated) {
      console.log('  -', token.symbol, '(' + token.name + ')');
      console.log('    Mint:', token.mint_address);
      console.log('    Migrated at:', token.migrated_at);
    }
  }

  await pool.end();
}

check().catch(console.error);
