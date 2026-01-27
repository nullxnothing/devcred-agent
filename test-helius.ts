/**
 * Quick test script for Helius API
 * Run with: npx tsx test-helius.ts
 */

import 'dotenv/config';

const WALLET = 'HyYNVYmnFmi87NsQqWzLJhUTPBKQUfgfhdbBa554nMFF';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const HELIUS_API_URL = `https://api.helius.xyz/v0`;

async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'test',
      method,
      params,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`RPC Error: ${data.error.message}`);
  }
  return data.result as T;
}

async function main() {
  console.log('Testing Helius API for wallet:', WALLET);
  console.log('API Key:', HELIUS_API_KEY ? `${HELIUS_API_KEY.slice(0, 8)}...` : 'NOT SET');
  console.log('---');

  if (!HELIUS_API_KEY) {
    console.error('ERROR: HELIUS_API_KEY not set in .env.local');
    process.exit(1);
  }

  try {
    // 1. Get tokens created by wallet
    console.log('\n1. Fetching tokens created by wallet...');
    const tokensResult = await heliusRpc<{ items: any[]; total: number }>('getAssetsByCreator', {
      creatorAddress: WALLET,
      onlyVerified: false,
      page: 1,
      limit: 50,
    });

    console.log(`   Found ${tokensResult.items.length} assets`);

    const fungibleTokens = tokensResult.items.filter(a => a.token_info);
    console.log(`   Fungible tokens: ${fungibleTokens.length}`);

    if (fungibleTokens.length > 0) {
      console.log('\n   Token List:');
      for (const token of fungibleTokens.slice(0, 10)) {
        console.log(`   - ${token.content?.metadata?.name || 'Unknown'} (${token.content?.metadata?.symbol || '???'})`);
        console.log(`     Mint: ${token.id}`);
        if (token.token_info?.price_info) {
          console.log(`     Price: $${token.token_info.price_info.price_per_token}`);
        }
      }
    }

    // 2. Get recent transactions
    console.log('\n2. Fetching recent transactions...');
    const txUrl = `${HELIUS_API_URL}/addresses/${WALLET}/transactions?api-key=${HELIUS_API_KEY}&limit=10`;
    const txResponse = await fetch(txUrl);
    const transactions = await txResponse.json();

    console.log(`   Found ${transactions.length} recent transactions`);

    if (transactions.length > 0) {
      console.log('\n   Recent Activity:');
      for (const tx of transactions.slice(0, 5)) {
        const date = new Date(tx.timestamp * 1000).toLocaleDateString();
        console.log(`   - [${date}] ${tx.type}: ${tx.description?.slice(0, 60) || 'No description'}...`);
      }
    }

    // 3. Get all NFTs/assets (for full picture)
    console.log('\n3. Fetching all assets owned by wallet...');
    const assetsResult = await heliusRpc<{ items: any[]; total: number }>('getAssetsByOwner', {
      ownerAddress: WALLET,
      page: 1,
      limit: 50,
    });

    console.log(`   Total assets owned: ${assetsResult.total}`);

    console.log('\n--- TEST COMPLETE ---');

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
