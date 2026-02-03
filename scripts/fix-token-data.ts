import { config } from 'dotenv';
config(); // Load from .env

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MINT = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump';

async function getHolderCount(mint: string): Promise<number> {
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'holder-count',
      method: 'getTokenAccounts',
      params: {
        mint,
        limit: 1,
        options: { showZeroBalance: false }
      }
    })
  });

  const data = await response.json();
  // The total field gives us total holder count
  return data.result?.total || 0;
}

async function getTokenCreationDate(mint: string): Promise<Date | null> {
  // Get token creation via signatures
  const url = `https://api.helius.xyz/v0/addresses/${mint}/transactions?api-key=${HELIUS_API_KEY}&type=NFT_MINT`;

  try {
    const response = await fetch(url);
    const txns = await response.json();

    if (txns && txns.length > 0) {
      // Find the earliest transaction
      const earliest = txns.reduce((min: any, t: any) =>
        t.timestamp < min.timestamp ? t : min
      , txns[0]);

      return new Date(earliest.timestamp * 1000);
    }
  } catch (e) {
    console.log('Could not fetch creation date via transactions');
  }

  return null;
}

async function main() {
  console.log('Fetching holder count from Helius...');
  const holderCount = await getHolderCount(MINT);
  console.log(`Holder count: ${holderCount}`);

  // For pump.fun tokens, we can estimate launch date from DexScreener
  // or set it manually. Let's check DexScreener for pair creation date
  console.log('\nFetching market data from DexScreener...');
  const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`);
  const dexData = await dexResponse.json();

  let launchDate = new Date();
  if (dexData.pairs && dexData.pairs.length > 0) {
    // Find earliest pair creation
    const earliest = dexData.pairs.reduce((min: any, p: any) =>
      p.pairCreatedAt < min.pairCreatedAt ? p : min
    , dexData.pairs[0]);
    launchDate = new Date(earliest.pairCreatedAt);
    console.log(`Earliest pair created: ${launchDate.toISOString()}`);
  }

  // Update the token
  console.log('\nUpdating token in database...');
  const result = await pool.query(
    `UPDATE dk_tokens
     SET holder_count = $1,
         launch_date = $2
     WHERE mint_address = $3
     RETURNING name, holder_count, launch_date`,
    [holderCount, launchDate.toISOString(), MINT]
  );

  console.log('Updated:', result.rows[0]);

  // Now calculate expected score
  const ageInDays = (Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24);

  let longevity = 0;
  if (ageInDays >= 90) longevity = 10;
  else if (ageInDays >= 30) longevity = 7;
  else if (ageInDays >= 7) longevity = 4;
  else if (ageInDays >= 1) longevity = 1;

  let holderRetention = 0;
  if (holderCount >= 5000) holderRetention = 20;
  else if (holderCount >= 1000) holderRetention = 15;
  else if (holderCount >= 500) holderRetention = 10;
  else if (holderCount >= 100) holderRetention = 5;
  else if (holderCount >= 50) holderRetention = 2;

  console.log(`\n--- Updated Score Breakdown ---`);
  console.log(`  Migration: 30/30`);
  console.log(`  Traction: 15/25 (ATH $500K)`);
  console.log(`  Holder Retention: ${holderRetention}/20 (${holderCount} holders)`);
  console.log(`  Dev Behavior: 10/15 (assumed)`);
  console.log(`  Longevity: ${longevity}/10 (${Math.round(ageInDays)} days)`);
  console.log(`  EXPECTED: ${30 + 15 + holderRetention + 10 + longevity}/100`);

  await pool.end();
}

main();
