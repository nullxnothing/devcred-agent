import 'dotenv/config';
import { scanWallet, scanWalletQuick } from '../lib/wallet-scan';

const wallet = '5bmb4PnoTiHd4Qm1kphqmFiKDgQCZThuPTG5vm1MsNZ4';

async function test() {
  console.log('=== WALLET SCAN SPEED TEST ===\n');
  console.log(`Wallet: ${wallet}\n`);

  // Test 1: Quick scan (skip rug detection)
  console.log('--- Quick Scan (skip rug detection) ---');
  const quickStart = Date.now();
  const quickResult = await scanWalletQuick(wallet);
  const quickTime = Date.now() - quickStart;

  console.log(`Tokens found: ${quickResult.tokensCreated.length}`);
  console.log(`Score: ${quickResult.totalScore}`);
  console.log(`Tier: ${quickResult.tierName}`);
  console.log(`Migrations: ${quickResult.breakdown.migrationCount}`);
  console.log(`Time: ${quickTime}ms (${(quickTime/1000).toFixed(2)}s)\n`);

  // Test 2: Full scan (with rug detection)
  console.log('--- Full Scan (with rug detection) ---');
  const fullStart = Date.now();
  const fullResult = await scanWallet(wallet, { skipCache: true });
  const fullTime = Date.now() - fullStart;

  console.log(`Tokens found: ${fullResult.tokensCreated.length}`);
  console.log(`Score: ${fullResult.totalScore}`);
  console.log(`Tier: ${fullResult.tierName}`);
  console.log(`Rugs detected: ${fullResult.breakdown.rugCount}`);
  console.log(`Time: ${fullTime}ms (${(fullTime/1000).toFixed(2)}s)\n`);

  // Test 3: Cached scan
  console.log('--- Cached Scan ---');
  const cachedStart = Date.now();
  const cachedResult = await scanWallet(wallet);
  const cachedTime = Date.now() - cachedStart;

  console.log(`Time: ${cachedTime}ms\n`);

  console.log('=== SUMMARY ===');
  console.log(`Quick scan: ${(quickTime/1000).toFixed(2)}s`);
  console.log(`Full scan:  ${(fullTime/1000).toFixed(2)}s`);
  console.log(`Cached:     ${cachedTime}ms`);
}

test().catch(console.error);
