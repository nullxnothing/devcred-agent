import 'dotenv/config';
import { getTokensCreatedByWalletViaFeePayer } from '../lib/helius';
import { batchGetTokenMarketData } from '../lib/dexscreener';

const wallet = process.argv[2] || 'DXRYr9kFH7WSRztkZ8rm9ycK9Xu7V6q222pAL74oXktv';

async function check() {
  console.log('Scanning wallet:', wallet);
  console.log('');

  const tokens = await getTokensCreatedByWalletViaFeePayer(wallet);
  console.log('Tokens created by this wallet:', tokens.length);
  console.log('');

  if (tokens.length > 0) {
    const mints = tokens.map(t => t.mintAddress);
    const marketData = await batchGetTokenMarketData(mints);

    let migratedCount = 0;
    for (const token of tokens) {
      const market = marketData.get(token.mintAddress);
      const migrated = market?.migrated || false;
      if (migrated) migratedCount++;
      console.log('- ' + token.symbol + ' (' + token.name + ')');
      console.log('  Mint: ' + token.mintAddress);
      console.log('  Migrated: ' + (migrated ? 'YES' : 'no') + ' (DEX: ' + (market?.dexId || 'none') + ')');
      console.log('');
    }
    console.log('Total migrations:', migratedCount);
  }
}

check().catch(console.error);
