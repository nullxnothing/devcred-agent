import 'dotenv/config';

const wallet = '5bmb4PnoTiHd4Qm1kphqmFiKDgQCZThuPTG5vm1MsNZ4';

async function findCreates() {
  let before: string | undefined;

  for (let page = 0; page < 30; page++) {
    let url = `https://api.helius.xyz/v0/addresses/${wallet}/transactions?api-key=${process.env.HELIUS_API_KEY}&limit=100`;
    if (before) url += `&before=${before}`;

    const response = await fetch(url);
    const txs = await response.json();

    if (txs.length === 0) {
      console.log('No more transactions');
      break;
    }

    before = txs[txs.length - 1].signature;

    // Look for CREATE transactions
    const creates = txs.filter((t: any) => t.type === 'CREATE');
    if (creates.length > 0) {
      console.log(`Found ${creates.length} CREATE txs on page ${page}`);
      for (const c of creates) {
        console.log('---');
        console.log('Type:', c.type);
        console.log('Source:', c.source);
        console.log('FeePayer:', c.feePayer);
        console.log('isFeePayer:', c.feePayer === wallet);
        console.log('TokenTransfers:', c.tokenTransfers?.length || 0);
        if (c.tokenTransfers) {
          for (const t of c.tokenTransfers) {
            console.log('  Mint:', t.mint);
            console.log('  To:', t.toUserAccount);
            console.log('  Amount:', t.tokenAmount);
          }
        }
      }
      break;
    }

    console.log(`Page ${page} - ${txs.length} txs, no CREATE`);
  }
}

findCreates().catch(console.error);
