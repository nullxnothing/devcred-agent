import 'dotenv/config';

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const SYSTEM_TOKEN_MINTS = new Set([
  'So11111111111111111111111111111111111111112',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
]);

const wallet = '5bmb4PnoTiHd4Qm1kphqmFiKDgQCZThuPTG5vm1MsNZ4';

async function debugScan() {
  const seenMints = new Set<string>();
  const mintInfos: Array<{ mint: string; signature: string; timestamp: number }> = [];

  let before: string | undefined;
  let hasMore = true;
  const MAX_PAGES = 5;
  let page = 0;

  while (hasMore && page < MAX_PAGES) {
    let url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
    if (before) url += `&before=${before}`;

    const response = await fetch(url);
    const transactions = await response.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      hasMore = false;
      break;
    }

    before = transactions[transactions.length - 1].signature;
    page++;

    console.log(`\nPage ${page}: ${transactions.length} txs`);

    for (const tx of transactions) {
      // Check 1: feePayer
      const isFeePayer = tx.feePayer?.toLowerCase() === wallet.toLowerCase();
      if (!isFeePayer) continue;

      // Check 2: ONLY CREATE type (matching helius.ts fix)
      const isCreateTx = tx.type === 'CREATE';
      if (!isCreateTx) continue;

      console.log(`  Found CREATE: type=${tx.type}`);

      // Check 3: tokenTransfers
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        for (const transfer of tx.tokenTransfers) {
          const walletReceivedTokens = transfer.toUserAccount?.toLowerCase() === wallet.toLowerCase();
          const isSystemToken = SYSTEM_TOKEN_MINTS.has(transfer.mint);
          const hasAmount = transfer.tokenAmount > 0;
          const notSeen = !seenMints.has(transfer.mint);

          console.log(`    Transfer: mint=${transfer.mint.slice(0,10)}... to=${transfer.toUserAccount?.slice(0,10)}...`);
          console.log(`    walletReceived=${walletReceivedTokens}, system=${isSystemToken}, amount=${transfer.tokenAmount}, notSeen=${notSeen}`);

          if (walletReceivedTokens && !isSystemToken && hasAmount && notSeen) {
            seenMints.add(transfer.mint);
            mintInfos.push({
              mint: transfer.mint,
              signature: tx.signature,
              timestamp: tx.timestamp,
            });
            console.log(`    >>> ADDED TOKEN: ${transfer.mint}`);
          }
        }
      } else {
        console.log(`    No tokenTransfers`);
      }
    }

    if (transactions.length < 100) hasMore = false;
  }

  console.log(`\n=== RESULT ===`);
  console.log(`Found ${mintInfos.length} tokens:`);
  mintInfos.forEach(m => console.log(`  ${m.mint}`));
}

debugScan().catch(console.error);
