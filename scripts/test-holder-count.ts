import { config } from 'dotenv';
config(); // Load from .env

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MINT = '8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump';

console.log('API Key loaded:', HELIUS_API_KEY ? `${HELIUS_API_KEY.slice(0, 8)}...` : 'NOT FOUND');

async function testDASMethod() {
  console.log('\nTesting DAS getTokenAccounts with mint filter...\n');

  // Try the Helius API endpoint instead
  const url = `https://api.helius.xyz/v0/token-accounts?api-key=${HELIUS_API_KEY}`;

  // Alternative: use the RPC endpoint with different format
  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  // Method 1: Try the DAS API
  console.log('Method 1: DAS API getTokenAccounts...');
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-1',
        method: 'getTokenAccounts',
        params: {
          mint: MINT,
          limit: 1,
          page: 1
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.log('  Error:', data.error.message);
    } else {
      console.log('  Total holders:', data.result?.total);
    }
  } catch (e: any) {
    console.log('  Failed:', e.message);
  }

  // Method 2: Try getTokenSupply for comparison
  console.log('\nMethod 2: getTokenSupply...');
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-2',
        method: 'getTokenSupply',
        params: [MINT]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.log('  Error:', data.error.message);
    } else {
      console.log('  Supply:', data.result?.value?.uiAmountString);
    }
  } catch (e: any) {
    console.log('  Failed:', e.message);
  }

  // Method 3: Try getProgramAccounts with memcmp filter
  console.log('\nMethod 3: getProgramAccounts with mint filter (limited)...');
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'test-3',
        method: 'getProgramAccounts',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
          {
            encoding: 'jsonParsed',
            filters: [
              { dataSize: 165 },
              { memcmp: { offset: 0, bytes: MINT } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (data.error) {
      console.log('  Error:', data.error.message);
    } else {
      console.log('  Accounts found:', data.result?.length || 0);
    }
  } catch (e: any) {
    console.log('  Failed:', e.message);
  }
}

testDASMethod();
