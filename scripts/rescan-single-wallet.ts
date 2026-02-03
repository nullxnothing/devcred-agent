import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway'
});

async function rescan() {
  const wallet = process.argv[2] || '4mqNznCN16V7tgXe1NGPAdJYz9vqdEvzYfc9CPPB7YP4';

  console.log('Clearing tokens for wallet:', wallet);

  // Delete all tokens for this wallet
  const result = await pool.query(
    'DELETE FROM dk_tokens WHERE creator_wallet = $1 RETURNING mint_address',
    [wallet]
  );

  console.log('Deleted', result.rowCount, 'tokens');
  console.log('');
  console.log('Now visit the profile page to trigger a fresh scan with corrected migration detection.');

  await pool.end();
}

rescan().catch(e => {
  console.error(e);
  process.exit(1);
});
