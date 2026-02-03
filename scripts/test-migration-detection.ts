/**
 * Test script for multi-source migration detection
 *
 * Run with: npx tsx scripts/test-migration-detection.ts
 */

import { detectMigration, batchDetectMigrations } from '../lib/migration-detection';
import * as dotenv from 'dotenv';

dotenv.config();

// Test tokens with known migration status
const TEST_CASES = [
  {
    name: 'FARTCOIN (migrated to Raydium)',
    mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    expectedMigrated: true,
  },
  {
    name: 'BONK (well-established, on multiple DEXes)',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    expectedMigrated: true,
  },
  {
    name: 'Random pump.fun token (likely not migrated)',
    mint: 'CLoRVkyJD8i2hJmhcYBo3qZL8jqLgBN2pqQGvRhxpump',
    expectedMigrated: false,
  },
];

async function testSingleDetection() {
  console.log('=== Testing Single Token Migration Detection ===\n');

  for (const testCase of TEST_CASES) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`  Mint: ${testCase.mint}`);

    const result = await detectMigration(testCase.mint);

    console.log(`  Migrated: ${result.migrated}`);
    console.log(`  Source: ${result.source}`);
    console.log(`  DEX: ${result.dexId}`);
    console.log(`  Pool: ${result.poolAddress}`);
    console.log(`  Liquidity: $${result.liquidityUsd.toLocaleString()}`);
    if (result.migratedAt) {
      console.log(`  Migrated At: ${result.migratedAt.toISOString()}`);
    }
    if (result.graduationPercentage !== undefined) {
      console.log(`  Graduation %: ${result.graduationPercentage}%`);
    }

    const status = result.migrated === testCase.expectedMigrated ? '✓' : '✗';
    console.log(`  Expected migrated=${testCase.expectedMigrated}: ${status}\n`);
  }
}

async function testBatchDetection() {
  console.log('=== Testing Batch Migration Detection ===\n');

  const tokens = TEST_CASES.map(tc => ({ mint: tc.mint }));

  console.log('Detecting migrations for all tokens in batch...');
  const startTime = Date.now();

  const results = await batchDetectMigrations(tokens);

  const duration = Date.now() - startTime;
  console.log(`Batch detection completed in ${duration}ms\n`);

  for (const testCase of TEST_CASES) {
    const result = results.get(testCase.mint);
    if (!result) {
      console.log(`${testCase.name}: No result found!`);
      continue;
    }

    const status = result.migrated === testCase.expectedMigrated ? '✓' : '✗';
    console.log(`${testCase.name}:`);
    console.log(`  Migrated: ${result.migrated} (expected: ${testCase.expectedMigrated}) ${status}`);
    console.log(`  Source: ${result.source}, DEX: ${result.dexId}\n`);
  }
}

async function main() {
  console.log('Migration Detection Test\n');
  console.log('========================\n');

  await testSingleDetection();
  await testBatchDetection();

  console.log('Tests completed!');
}

main().catch(console.error);
