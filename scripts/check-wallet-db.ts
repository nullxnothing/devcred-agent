import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway'
});

async function check() {
  const wallet = '4mqNznCN16V7tgXe1NGPAdJYz9vqdEvzYfc9CPPB7YP4';

  // Get tokens for this wallet
  const tokens = await pool.query(
    'SELECT mint_address, name, symbol, migrated, status FROM dk_tokens WHERE creator_wallet = $1',
    [wallet]
  );

  console.log('Tokens in DB:', tokens.rows.length);
  console.log('Migrated count:', tokens.rows.filter((t: any) => t.migrated).length);
  console.log('');

  for (const t of tokens.rows as any[]) {
    console.log(t.symbol, t.migrated ? '[MIGRATED]' : '', t.status === 'rug' ? '[RUG]' : '');
  }

  await pool.end();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
