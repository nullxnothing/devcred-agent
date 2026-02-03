import { getTokensCreatedByWalletVerified, getTokensCreatedByWallet, getTokensCreatedByWalletViaFeePayer, detectRugPattern } from '../lib/helius';
import { getMigrationStatusCombined } from '../lib/dexscreener';

async function testWallet(walletAddress: string) {
  console.log('Testing wallet:', walletAddress);
  console.log('');

  // Test 1: Standard DAS API (old method)
  console.log('=== Method 1: DAS API getAssetsByCreator (OLD - misses pump.fun) ===');
  try {
    const dasTokens = await getTokensCreatedByWallet(walletAddress);
    console.log('Tokens found via DAS:', dasTokens.length);
    for (const token of dasTokens) {
      console.log('  -', token.symbol, token.mintAddress.slice(0, 8) + '...');
    }
  } catch (err: any) {
    console.error('DAS Error:', err.message);
  }
  console.log('');

  // Test 2: FeePayer-based discovery (new method for pump.fun)
  console.log('=== Method 2: FeePayer Verification (NEW - catches pump.fun) ===');
  try {
    const feePayerTokens = await getTokensCreatedByWalletViaFeePayer(walletAddress);
    console.log('Tokens found via feePayer:', feePayerTokens.length);
    for (const token of feePayerTokens) {
      console.log('  -', token.symbol, '(' + token.name + ')');
      console.log('    Mint:', token.mintAddress);
      console.log('    Verified:', token.creationVerified ? 'YES' : 'NO');
      console.log('    Creation sig:', token.creationSignature?.slice(0, 20) + '...' || 'N/A');
    }
  } catch (err: any) {
    console.error('FeePayer Error:', err.message);
  }
  console.log('');

  // Test 3: Combined verified discovery
  console.log('=== Method 3: Combined Verified Discovery (RECOMMENDED) ===');
  try {
    const result = await getTokensCreatedByWalletVerified(walletAddress);
    console.log('Total tokens found:', result.totalTokens);
    console.log('Migrated count:', result.migratedCount);
    console.log('');

    if (result.tokens.length > 0) {
      console.log('All Tokens:');
      for (const token of result.tokens) {
        const migrationInfo = result.migrated.get(token.mintAddress);
        console.log('');
        console.log('  Token:', token.symbol, '(' + token.name + ')');
        console.log('  Mint:', token.mintAddress);
        console.log('  Creator Verified:', token.creationVerified ? 'YES (feePayer match)' : 'NO (DAS only)');
        console.log('  Creation Sig:', token.creationSignature?.slice(0, 30) + '...' || 'N/A');
        console.log('  Migrated:', migrationInfo ? 'YES' : 'NO');

        // Check migration status via GeckoTerminal
        const migration = await getMigrationStatusCombined(token.mintAddress);
        console.log('  Migration Status:', migration.migrated ? 'YES (' + migration.migrationType + ')' : 'NO');
        if (migration.liquidityUsd > 0) {
          console.log('  Liquidity: $' + migration.liquidityUsd.toLocaleString());
        }

        // Check for rug pattern
        const rugCheck = await detectRugPattern(walletAddress, token.mintAddress, token.creationTimestamp);
        console.log('  Rug Check:', rugCheck.isRug ? 'YES (' + rugCheck.severity + ', ' + rugCheck.sellPercent.toFixed(1) + '% sold)' : 'NO (' + rugCheck.sellPercent.toFixed(1) + '% sold)');
      }
    } else {
      console.log('No tokens found for this wallet');
    }
  } catch (err: any) {
    console.error('Combined Error:', err.message);
    console.error(err.stack);
  }
}

// Run test
const wallet = process.argv[2] || 'YvHaRNYV5yw6EMXaPSkqKx6JFcTMJrui1aWbWMP4xab';
testWallet(wallet).then(() => {
  console.log('\nTest complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
