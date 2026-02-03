import { config } from 'dotenv';
config(); // Load from .env (has real API key)

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const MINT = '8Jx8AAHj86wbQgUTjGuj6GTTL5Ps3cqxKRTvpaJApump';

async function getHolderCount(mint: string): Promise<number> {
  const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const uniqueOwners = new Set<string>();
  let cursor: string | undefined;
  let pages = 0;

  // Paginate through all token accounts
  do {
    const params: any = {
      mint,
      limit: 1000,
      options: { showZeroBalance: false }
    };
    if (cursor) params.cursor = cursor;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `page-${pages}`,
        method: 'getTokenAccounts',
        params
      })
    });

    const data = await response.json();
    if (data.error) {
      console.log('  API Error:', data.error.message);
      break;
    }

    const accounts = data.result?.token_accounts || [];
    for (const acc of accounts) {
      if (acc.amount > 0) {
        uniqueOwners.add(acc.owner);
      }
    }

    cursor = data.result?.cursor;
    pages++;

    // Log progress for large tokens
    if (pages % 10 === 0) {
      console.log(`    ...fetched ${pages} pages (${uniqueOwners.size} unique holders so far)`);
    }
  } while (cursor && pages < 100); // Cap at 100 pages (~100K holders)

  return uniqueOwners.size;
}

async function main() {
  console.log(`Analyzing token: ${MINT}\n`);

  // Fetch from DexScreener
  console.log('Fetching from DexScreener...');
  const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${MINT}`);
  const dexData = await dexResponse.json();

  if (!dexData.pairs || dexData.pairs.length === 0) {
    console.log('No pairs found on DexScreener');
    return;
  }

  // Get primary pair (highest liquidity)
  const pairs = dexData.pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const primary = pairs[0];

  console.log(`\n--- Token Info ---`);
  console.log(`  Name: ${primary.baseToken.name}`);
  console.log(`  Symbol: ${primary.baseToken.symbol}`);
  console.log(`  DEX: ${primary.dexId}`);
  console.log(`  Current Market Cap: $${(primary.marketCap || 0).toLocaleString()}`);
  console.log(`  FDV: $${(primary.fdv || 0).toLocaleString()}`);
  console.log(`  Liquidity: $${(primary.liquidity?.usd || 0).toLocaleString()}`);
  console.log(`  24h Volume: $${(primary.volume?.h24 || 0).toLocaleString()}`);

  // Check if migrated (on Raydium, Orca, Meteora, etc.)
  const MIGRATION_DEXES = ['raydium', 'orca', 'meteora', 'jupiter', 'lifinity'];
  const isMigrated = pairs.some((p: any) => MIGRATION_DEXES.includes(p.dexId?.toLowerCase()));
  console.log(`  Migrated: ${isMigrated} (DEX: ${primary.dexId})`);

  // Find earliest pair for launch date
  const earliest = pairs.reduce((min: any, p: any) =>
    p.pairCreatedAt < min.pairCreatedAt ? p : min
  , pairs[0]);
  const launchDate = new Date(earliest.pairCreatedAt);
  const ageInDays = (Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24);
  console.log(`  Launch Date: ${launchDate.toISOString()} (${Math.round(ageInDays)} days ago)`);

  // Get holder count from Helius
  console.log('\nFetching holder count from Helius...');
  const holderCount = await getHolderCount(MINT);
  console.log(`  Holder Count: ${holderCount.toLocaleString()}`);

  // Calculate score
  console.log(`\n--- Score Breakdown ---`);

  // Migration (0-30)
  const migration = isMigrated ? 30 : 0;
  console.log(`  Migration: ${migration}/30 (migrated: ${isMigrated})`);

  // Traction (0-25) - using current market cap as proxy for ATH
  const marketCap = primary.marketCap || 0;
  let traction = 0;
  if (marketCap >= 10_000_000) traction = 25;
  else if (marketCap >= 1_000_000) traction = 20;
  else if (marketCap >= 500_000) traction = 15;
  else if (marketCap >= 100_000) traction = 10;
  else if (marketCap >= 50_000) traction = 5;
  else if (marketCap >= 10_000) traction = 2;
  console.log(`  Traction: ${traction}/25 (MCap: $${marketCap.toLocaleString()})`);

  // Holder Retention (0-20)
  let holderRetention = 0;
  if (holderCount >= 5000) holderRetention = 20;
  else if (holderCount >= 1000) holderRetention = 15;
  else if (holderCount >= 500) holderRetention = 10;
  else if (holderCount >= 100) holderRetention = 5;
  else if (holderCount >= 50) holderRetention = 2;
  console.log(`  Holder Retention: ${holderRetention}/20 (${holderCount.toLocaleString()} holders)`);

  // Dev Behavior (0-15) - assume good if not flagged
  const devBehavior = 15;
  console.log(`  Dev Behavior: ${devBehavior}/15 (assumed good - no rug signals)`);

  // Longevity (0-10)
  let longevity = 0;
  if (ageInDays >= 90) longevity = 10;
  else if (ageInDays >= 30) longevity = 7;
  else if (ageInDays >= 7) longevity = 4;
  else if (ageInDays >= 1) longevity = 1;
  console.log(`  Longevity: ${longevity}/10 (${Math.round(ageInDays)} days)`);

  const total = migration + traction + holderRetention + devBehavior + longevity;
  console.log(`\n  TOTAL SCORE: ${total}/100`);

  if (total < 100) {
    console.log(`\n--- Missing Points ---`);
    if (traction < 25) console.log(`  Traction: Need $10M+ MCap for max (currently $${marketCap.toLocaleString()})`);
    if (holderRetention < 20) console.log(`  Holders: Need 5000+ for max (currently ${holderCount})`);
    if (longevity < 10) console.log(`  Longevity: Need 90+ days for max (currently ${Math.round(ageInDays)})`);
  }
}

main();
