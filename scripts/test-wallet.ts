import 'dotenv/config';
import { getAllTokensCreatedByWallet, getTokensCreatedByWallet, getTokensFromTransactionHistory } from '../lib/helius';
import { checkMigrationStatus } from '../lib/dexscreener';

const WALLET = 'G6k9a2JjrFpyJC7aWhGc4b3Zfr7JKFQmtAtbjs7hsbFK';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

async function testWallet() {
  console.log('Testing wallet:', WALLET);
  
  // Test the combined method
  console.log('\n=== Combined: getAllTokensCreatedByWallet ===');
  const allTokens = await getAllTokensCreatedByWallet(WALLET);
  console.log('Total tokens found:', allTokens.length);
  
  for (const t of allTokens) {
    console.log(`\n  Token: ${t.name} (${t.symbol})`);
    console.log(`  Mint: ${t.mintAddress}`);
    
    // Check DexScreener for migration status
    try {
      const migrationInfo = await checkMigrationStatus(t.mintAddress);
      console.log(`  Migrated: ${migrationInfo.migrated}`);
      if (migrationInfo.migrated) {
        console.log(`  Migration Type: ${migrationInfo.migrationType}`);
        console.log(`  Liquidity: $${migrationInfo.liquidityUsd?.toLocaleString()}`);
        console.log(`  Market Cap: $${migrationInfo.pool?.marketCap?.toLocaleString()}`);
      }
    } catch (e: any) {
      console.log(`  DexScreener error: ${e.message}`);
    }
  }
}

testWallet().catch(console.error);
