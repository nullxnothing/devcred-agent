import { detectTokensCreatedByWallet } from '../lib/token-detection';
import { getMigratedTokensFromSwapHistory } from '../lib/helius';

async function test() {
  const wallet = '4mqNznCN16V7tgXe1NGPAdJYz9vqdEvzYfc9CPPB7YP4';

  console.log('Detecting tokens for wallet:', wallet);
  const result = await detectTokensCreatedByWallet(wallet);
  console.log('Found', result.tokens.length, 'tokens');

  const mints = new Set(result.tokens.map(t => t.mintAddress));
  console.log('Checking migrations...');
  const migrations = await getMigratedTokensFromSwapHistory(wallet, mints);

  console.log('\nMigrations found:', migrations.size);
  for (const [mint, info] of migrations) {
    const token = result.tokens.find(t => t.mintAddress === mint);
    console.log('-', token?.symbol || mint.slice(0,8), '- DEX:', info.dexSource);
  }

  console.log('\nAll tokens:');
  for (const t of result.tokens) {
    const migrated = migrations.has(t.mintAddress);
    console.log('-', t.symbol, migrated ? '[MIGRATED]' : '');
  }
}

test().catch(console.error);
