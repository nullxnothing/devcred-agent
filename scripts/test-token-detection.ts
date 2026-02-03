/**
 * Test script for the new token detection module
 *
 * Usage: npx tsx scripts/test-token-detection.ts <wallet_address>
 *
 * This script tests the new detection logic against a known wallet
 * to verify it correctly identifies pump.fun token creators.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load env files (.env.local first, then .env overrides)
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

import { detectTokensCreatedByWallet, verifyTokenCreation, hasCreatedTokens } from '../lib/token-detection';

// Known test wallets - add your own for testing
const TEST_WALLETS = {
  // Add known dev wallets here for comparison testing
  // 'label': 'wallet_address'
};

async function main() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.log('Usage: npx ts-node scripts/test-token-detection.ts <wallet_address>');
    console.log('\nExample:');
    console.log('  npx ts-node scripts/test-token-detection.ts 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('TOKEN DETECTION TEST - New Module v2');
  console.log('='.repeat(60));
  console.log(`\nWallet: ${walletAddress}`);
  console.log('\n--- Quick Check ---');

  // Quick check first
  const hasTokens = await hasCreatedTokens(walletAddress);
  console.log(`Has created tokens: ${hasTokens ? 'YES' : 'NO'}`);

  if (!hasTokens) {
    console.log('\nNo tokens found with quick scan. Running full scan anyway...');
  }

  console.log('\n--- Full Scan ---');
  console.log('Scanning transaction history (this may take a moment)...\n');

  const result = await detectTokensCreatedByWallet(walletAddress, {
    maxPages: 30,
    includeMetadata: true,
  });

  console.log(`Scan completed in ${(result.scanDuration / 1000).toFixed(2)}s`);
  console.log(`\nResults:`);
  console.log(`  Total tokens found: ${result.totalFound}`);
  console.log(`  Pump.fun tokens:    ${result.pumpFunCount}`);
  console.log(`  SPL tokens:         ${result.splCount}`);
  console.log(`  Skipped (LP/AMM):   ${result.skippedCount}`);

  if (result.tokens.length > 0) {
    console.log('\n--- Detected Tokens ---\n');

    for (const token of result.tokens) {
      const date = new Date(token.creationTimestamp * 1000).toISOString().split('T')[0];
      console.log(`${token.symbol} (${token.name})`);
      console.log(`  Mint:       ${token.mintAddress}`);
      console.log(`  Created:    ${date}`);
      console.log(`  Method:     ${token.creationMethod}`);
      console.log(`  Confidence: ${token.confidence}`);
      console.log(`  Signature:  ${token.creationSignature}`);
      if (token.pricePerToken) {
        console.log(`  Price:      $${token.pricePerToken.toFixed(8)}`);
      }
      console.log('');
    }
  }

  // If tokens found, verify one of them
  if (result.tokens.length > 0) {
    console.log('--- Verification Test ---\n');
    const testToken = result.tokens[0];
    console.log(`Verifying creation of ${testToken.symbol}...`);

    const verification = await verifyTokenCreation(walletAddress, testToken.mintAddress);
    console.log(`  Is creator: ${verification.isCreator}`);
    console.log(`  Confidence: ${verification.confidence}`);
    if (verification.method) {
      console.log(`  Method:     ${verification.method}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
