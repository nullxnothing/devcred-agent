import 'dotenv/config';
import { scanWalletQuick } from '../lib/wallet-scan';

async function test() {
  const wallet = process.argv[2] || 'FYKVqqi9CcioiRuyYrnjju6ZmDb1CdBxBuXYyzg3p7qa';
  console.log('Running scanWalletQuick for:', wallet);
  console.log('HELIUS_API_KEY present:', !!process.env.HELIUS_API_KEY);

  const result = await scanWalletQuick(wallet);
  console.log('Tokens found:', result.tokensCreated.length);
  console.log('Total found:', result.totalTokensFound);
  console.log('Migration count:', result.breakdown.migrationCount);

  result.tokensCreated.forEach(t => {
    console.log(' -', t.symbol, '| migrated:', t.migrated, '| mcap:', t.marketCap);
  });
}

test().catch(e => console.error('Error:', e));
