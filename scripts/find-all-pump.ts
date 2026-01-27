import 'dotenv/config';

const WALLET = 'G6k9a2JjrFpyJC7aWhGc4b3Zfr7JKFQmtAtbjs7hsbFK';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

async function findAllPumpTokens() {
  let before: string | undefined;
  let page = 0;
  const allPumpMints = new Set<string>();
  const createTxMints = new Map<string, { type: string; signature: string }>();
  let totalTxs = 0;
  
  // Scan ALL transactions (up to 2000)
  while (page < 20) {
    let url = `https://api.helius.xyz/v0/addresses/${WALLET}/transactions?api-key=${HELIUS_API_KEY}&limit=100`;
    if (before) url += `&before=${before}`;
    
    const res = await fetch(url);
    const txs = await res.json();
    if (!Array.isArray(txs) || txs.length === 0) break;
    
    console.log('Page', page, '- txs:', txs.length);
    totalTxs += txs.length;
    
    for (const tx of txs) {
      const isCreate = tx.type === 'CREATE';
      const isPumpTx = tx.instructions?.some((i: any) => i.programId === PUMP_PROGRAM) || 
                       JSON.stringify(tx).includes(PUMP_PROGRAM);
      
      if (tx.tokenTransfers) {
        for (const t of tx.tokenTransfers) {
          if (t.mint?.endsWith('pump')) {
            allPumpMints.add(t.mint);
            // Track if wallet received tokens (could be creator)
            if (t.toUserAccount === WALLET) {
              if (!createTxMints.has(t.mint)) {
                createTxMints.set(t.mint, { type: tx.type, signature: tx.signature });
              }
            }
          }
        }
      }
    }
    
    before = txs[txs.length - 1].signature;
    page++;
    if (txs.length < 100) break;
  }
  
  console.log('\nTotal transactions scanned:', totalTxs);
  console.log('\nAll pump mints interacted with:', allPumpMints.size);
  [...allPumpMints].forEach(m => console.log('  -', m));
  
  console.log('\nMints where wallet RECEIVED tokens (likely created):');
  createTxMints.forEach((info, mint) => console.log('  -', mint, `(${info.type})`));
  
  // Get metadata for tokens the wallet received
  console.log('\n=== Token Details ===');
  for (const mint of createTxMints.keys()) {
    try {
      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'test',
          method: 'getAsset',
          params: { id: mint }
        })
      });
      const data = await res.json();
      const asset = data.result;
      console.log(`\n${asset?.content?.metadata?.name} (${asset?.content?.metadata?.symbol})`);
      console.log(`  Mint: ${mint}`);
    } catch (e) {
      console.log('Error getting', mint);
    }
  }
}

findAllPumpTokens().catch(console.error);
