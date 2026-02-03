import * as dotenv from 'dotenv';
dotenv.config();

import { scanWallet } from '../lib/wallet-scan';

async function test() {
  const wallet = process.argv[2] || '5mt2LosBzGiMq3BdwV9seCsV2h5Q9SzfGeLJqRm5941F';

  console.log('Scanning wallet:', wallet);
  console.log('');

  try {
    const result = await scanWallet(wallet, {
      verbose: true,
      skipCache: true
    });

    console.log('\n=== Wallet Scan Results ===');
    console.log('Total tokens:', result.breakdown.tokenCount);
    console.log('Migrated tokens:', result.breakdown.migrationCount);
    console.log('Rug count:', result.breakdown.rugCount);
    console.log('Avg token score:', result.breakdown.averageTokenScore);
    console.log('Total score:', result.totalScore);
    console.log('Tier:', result.tierName);
    console.log('Scan duration:', result.scanDuration + 'ms');

    if (result.tokensCreated.length > 0) {
      console.log('\nTokens:');
      for (const token of result.tokensCreated) {
        const migStatus = token.migrated ? '✓ MIGRATED' : '✗ not migrated';
        console.log(`  ${token.symbol} (${token.name})`);
        console.log(`    Migration: ${migStatus}`);
        console.log(`    Score: ${token.score.total}`);
        console.log(`    Holders: ${token.currentHolders}`);
        console.log(`    Market Cap: $${token.marketCap ? token.marketCap.toLocaleString() : 'N/A'}`);
        console.log('');
      }
    } else {
      console.log('\nNo tokens found for this wallet.');
    }
  } catch (error) {
    console.error('Error scanning wallet:', error);
  }
}

test();
