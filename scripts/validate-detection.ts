/**
 * Token Detection Validation Script
 *
 * Comprehensive testing of the token detection system against
 * known wallets to ensure accuracy and performance.
 *
 * Usage: npx tsx scripts/validate-detection.ts
 *
 * Based on the DevKarma Token Detection Testing Checklist
 */

import * as fs from 'fs';
import * as path from 'path';

// Load env files
for (const envFile of ['.env.local', '.env']) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx);
        const value = trimmed.substring(idx + 1);
        if (key && value) {
          process.env[key] = value;
        }
      }
    }
  }
}

import { getTokensCreatedByWalletViaFeePayer } from '../lib/helius';
import { batchGetTokenMarketData } from '../lib/dexscreener';
import { scanWallet, scanWalletQuick } from '../lib/wallet-scan';

// ============================================================
// TEST CASES - Configure your test wallets here
// ============================================================

interface TestCase {
  name: string;
  wallet: string;
  expectedMints?: string[];
  expectedCount?: number;
  shouldBeEmpty?: boolean;
  description: string;
}

const TEST_CASES: TestCase[] = [
  // Test Case 1: Known Pump.fun Dev Wallet
  {
    name: 'Known Pump.fun Dev',
    wallet: '5bmb4PnoTiHd4Qm1kphqmFiKDgQCZThuPTG5vm1MsNZ4',
    description: 'Wallet that launched pump.fun tokens',
    // Uncomment and add expected mints if known:
    // expectedMints: ['DTZVrXYhftotp5UXRyz3rav5Szjt7rCgebBMU5FDpump'],
  },

  // Test Case 2: Second test wallet
  {
    name: 'Test Wallet 2',
    wallet: '92poia8DKMNRckqgBxppR8WYUr5JkXQFuJc1ZWAboyUm',
    description: 'Second test wallet',
  },

  // Add more test cases as needed:
  // {
  //   name: 'Buyer Only (Should Be Empty)',
  //   wallet: 'BUYER_WALLET_ADDRESS',
  //   shouldBeEmpty: true,
  //   description: 'Wallet that only bought tokens, never launched',
  // },
  // {
  //   name: 'Multi-Token Dev',
  //   wallet: 'MULTI_TOKEN_DEV_ADDRESS',
  //   expectedCount: 5,
  //   description: 'Dev who launched multiple tokens',
  // },
];

// ============================================================
// PERFORMANCE BENCHMARKS
// ============================================================

const PERFORMANCE_TARGETS = {
  '1-5 tokens': 3000,
  '10-20 tokens': 8000,
  '50+ tokens': 20000,
};

// ============================================================
// TEST RUNNER
// ============================================================

interface TestResult {
  name: string;
  wallet: string;
  passed: boolean;
  duration: number;
  tokensFound: number;
  tokens: Array<{
    mint: string;
    name: string;
    symbol: string;
  }>;
  missing: string[];
  extra: string[];
  error?: string;
  meetsPerformanceTarget: boolean;
}

function getPerformanceTarget(tokenCount: number): number {
  if (tokenCount <= 5) return PERFORMANCE_TARGETS['1-5 tokens'];
  if (tokenCount <= 20) return PERFORMANCE_TARGETS['10-20 tokens'];
  return PERFORMANCE_TARGETS['50+ tokens'];
}

async function runDetectionTest(testCase: TestCase): Promise<TestResult> {
  const startTime = Date.now();

  try {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`TEST: ${testCase.name}`);
    console.log(`Wallet: ${testCase.wallet}`);
    console.log(`Description: ${testCase.description}`);
    console.log('─'.repeat(60));

    const tokens = await getTokensCreatedByWalletViaFeePayer(testCase.wallet);
    const duration = Date.now() - startTime;

    const returnedMints = tokens.map(t => t.mintAddress);

    // Check results
    let missing: string[] = [];
    let extra: string[] = [];
    let passed = true;

    if (testCase.expectedMints) {
      missing = testCase.expectedMints.filter(m => !returnedMints.includes(m));
      extra = returnedMints.filter(m => !testCase.expectedMints!.includes(m));
      passed = missing.length === 0;
    } else if (testCase.shouldBeEmpty) {
      passed = tokens.length === 0;
      extra = returnedMints;
    } else if (testCase.expectedCount !== undefined) {
      passed = tokens.length === testCase.expectedCount;
    }

    // Check performance
    const target = getPerformanceTarget(tokens.length);
    const meetsPerformanceTarget = duration < target;

    // Log results
    console.log(`\nResults:`);
    console.log(`  Duration: ${duration}ms (target: <${target}ms) ${meetsPerformanceTarget ? '✅' : '⚠️'}`);
    console.log(`  Tokens found: ${tokens.length}`);

    if (tokens.length > 0) {
      console.log('\n  Tokens detected:');
      for (const token of tokens.slice(0, 10)) {
        const date = token.creationTimestamp
          ? new Date(token.creationTimestamp * 1000).toLocaleDateString()
          : 'unknown';
        console.log(`    • ${token.symbol} (${token.name})`);
        console.log(`      Mint: ${token.mintAddress.slice(0, 20)}...`);
        console.log(`      Created: ${date}, Verified: ${token.creationVerified ? '✅' : '❓'}`);
      }
      if (tokens.length > 10) {
        console.log(`    ... and ${tokens.length - 10} more`);
      }
    }

    if (missing.length > 0) {
      console.log(`\n  ❌ MISSING (expected but not found):`);
      missing.forEach(m => console.log(`    ${m}`));
    }

    if (extra.length > 0 && testCase.expectedMints) {
      console.log(`\n  ⚠️ EXTRA (found but not expected):`);
      extra.forEach(m => console.log(`    ${m}`));
    }

    console.log(`\n  Overall: ${passed ? '✅ PASSED' : '❌ FAILED'}`);

    return {
      name: testCase.name,
      wallet: testCase.wallet,
      passed,
      duration,
      tokensFound: tokens.length,
      tokens: tokens.map(t => ({
        mint: t.mintAddress,
        name: t.name,
        symbol: t.symbol,
      })),
      missing,
      extra,
      meetsPerformanceTarget,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`\n  ❌ ERROR: ${error}`);

    return {
      name: testCase.name,
      wallet: testCase.wallet,
      passed: false,
      duration,
      tokensFound: 0,
      tokens: [],
      missing: testCase.expectedMints || [],
      extra: [],
      error: String(error),
      meetsPerformanceTarget: false,
    };
  }
}

async function runFullScanTest(wallet: string): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('FULL WALLET SCAN TEST');
  console.log('═'.repeat(60));

  try {
    console.log(`\nRunning full scan on ${wallet}...`);
    const startTime = Date.now();

    const result = await scanWalletQuick(wallet);

    console.log(`\n📊 Scan Results:`);
    console.log(`  Duration: ${result.scanDuration}ms`);
    console.log(`  Tokens: ${result.breakdown.tokenCount}`);
    console.log(`  Migrations: ${result.breakdown.migrationCount}`);
    console.log(`  Rugs: ${result.breakdown.rugCount}`);
    console.log(`  Score: ${result.totalScore}/740`);
    console.log(`  Tier: ${result.tierName} (${result.tier})`);

    if (result.tokensCreated.length > 0) {
      console.log('\n📈 Token Score Breakdown:');
      for (const token of result.tokensCreated.slice(0, 5)) {
        console.log(`\n  ${token.symbol}:`);
        console.log(`    Total Score: ${token.score.total}/100`);
        console.log(`    ├─ Migration:  ${token.score.migration}/30`);
        console.log(`    ├─ Traction:   ${token.score.traction}/25`);
        console.log(`    ├─ Holders:    ${token.score.holderRetention}/20 (${token.currentHolders} holders)`);
        console.log(`    ├─ Dev Hold:   ${token.score.devBehavior}/15 (${token.devHoldingPercent.toFixed(1)}%)`);
        console.log(`    └─ Longevity:  ${token.score.longevity}/10`);
      }

      // Fetch market data
      console.log('\n💹 Market Data:');
      const mints = result.tokensCreated.slice(0, 5).map(t => t.mintAddress);
      const marketData = await batchGetTokenMarketData(mints);

      for (const token of result.tokensCreated.slice(0, 5)) {
        const market = marketData.get(token.mintAddress);
        if (market && market.marketCap) {
          console.log(`  ${token.symbol}:`);
          console.log(`    MCap: $${market.marketCap.toLocaleString()}`);
          console.log(`    Liquidity: $${(market.liquidity || 0).toLocaleString()}`);
          console.log(`    DEX: ${market.dexId || 'None'}`);
          console.log(`    Migrated: ${market.migrated ? 'Yes ✅' : 'No'}`);
        }
      }
    }

    console.log(`\nFull scan total time: ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('Full scan test failed:', error);
  }
}

async function runEdgeCaseTests(): Promise<void> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log('EDGE CASE TESTS');
  console.log('═'.repeat(60));

  // Test 1: Invalid wallet address
  console.log('\n1. Invalid wallet address handling:');
  try {
    await getTokensCreatedByWalletViaFeePayer('invalid-address');
    console.log('   ❌ Should have thrown an error');
  } catch {
    console.log('   ✅ Correctly threw error for invalid address');
  }

  // Test 2: Empty/new wallet
  console.log('\n2. Empty wallet handling:');
  try {
    // Using a likely empty address (random valid format)
    const result = await getTokensCreatedByWalletViaFeePayer('11111111111111111111111111111111');
    console.log(`   ✅ Returned ${result.length} tokens (should be 0)`);
  } catch (error) {
    console.log(`   ⚠️ Error: ${error}`);
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           DevKarma Token Detection Validator               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check environment
  if (!process.env.HELIUS_API_KEY) {
    console.error('❌ HELIUS_API_KEY not set in environment');
    process.exit(1);
  }
  console.log('✅ Helius API key configured');
  console.log(`📋 Running ${TEST_CASES.length} test cases\n`);

  // Run all detection tests
  const results: TestResult[] = [];
  for (const testCase of TEST_CASES) {
    const result = await runDetectionTest(testCase);
    results.push(result);
  }

  // Run full scan test on first wallet
  if (TEST_CASES.length > 0) {
    await runFullScanTest(TEST_CASES[0].wallet);
  }

  // Run edge case tests
  await runEdgeCaseTests();

  // Print summary
  console.log(`\n${'═'.repeat(60)}`);
  console.log('SUMMARY');
  console.log('═'.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const performanceOk = results.filter(r => r.meetsPerformanceTarget).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const totalTokens = results.reduce((sum, r) => sum + r.tokensFound, 0);

  console.log(`\nTest Results:`);
  console.log(`  Total tests:    ${results.length}`);
  console.log(`  Passed:         ${passed} ✅`);
  console.log(`  Failed:         ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`  Performance OK: ${performanceOk}/${results.length}`);

  console.log(`\nPerformance:`);
  console.log(`  Average duration: ${Math.round(avgDuration)}ms`);
  console.log(`  Total tokens found: ${totalTokens}`);

  console.log(`\nPerformance Targets:`);
  for (const [range, target] of Object.entries(PERFORMANCE_TARGETS)) {
    console.log(`  ${range}: < ${target}ms`);
  }

  if (failed > 0) {
    console.log(`\n❌ Failed tests:`);
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  • ${result.name}: ${result.error || 'Mismatch in expected tokens'}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log(failed === 0 ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('═'.repeat(60));
}

main().catch(console.error);
