import { config } from 'dotenv';
config(); // Load from .env

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MINT = '8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump';

async function method1() {
  console.log('Method 1: getTokenAccounts...');
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'getTokenAccounts',
      params: { mint: MINT, limit: 1, options: { showZeroBalance: false } }
    })
  });
  const data = await response.json();
  console.log('  Total:', data.result?.total || 0);
  return data.result?.total || 0;
}

async function method2() {
  console.log('\nMethod 2: DAS getAsset...');
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '2',
      method: 'getAsset',
      params: { id: MINT }
    })
  });
  const data = await response.json();
  console.log('  Token supply info:', data.result?.token_info?.supply, data.result?.token_info?.decimals);
  return data;
}

async function method3() {
  console.log('\nMethod 3: getTokenLargestAccounts (RPC)...');
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: '3',
      method: 'getTokenLargestAccounts',
      params: [MINT]
    })
  });
  const data = await response.json();
  const accounts = data.result?.value || [];
  console.log('  Top holders count:', accounts.length);
  if (accounts.length > 0) {
    console.log('  Top 3:', accounts.slice(0, 3).map((a: any) => ({
      amount: a.uiAmountString,
      address: a.address.slice(0, 8) + '...'
    })));
  }
  return accounts.length;
}

async function method4() {
  console.log('\nMethod 4: Birdeye API (if available)...');
  // Birdeye requires API key, skip for now
  console.log('  Skipped (needs API key)');
}

async function main() {
  await method1();
  await method2();
  await method3();
  await method4();

  console.log('\n--- Conclusion ---');
  console.log('The getTokenAccounts method may not work for all tokens.');
  console.log('For accurate holder counts, consider using:');
  console.log('  - Birdeye API');
  console.log('  - Solscan API');
  console.log('  - Or counting via paginated getTokenAccounts');
}

main();
