/**
 * Calculate DevKarma score for a wallet
 * Tests COMBINED detection: DAS API + Transaction History
 * Run with: npx tsx test-score.ts
 */

import 'dotenv/config';
import { getAllTokensCreatedByWallet, getTokensCreatedByWallet } from './lib/helius';
import { getTokenMarketData, checkMigrationStatus } from './lib/dexscreener';

const WALLET = 'CFqsrQbvhb1Z3XKHVAZg6sovZzTg5NN9X9RnTf3D2BBZ';
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  marketCap: number | null;
  volume24h: number | null;
  liquidity: number | null;
  migrated: boolean;
  dex: string | null;
  launchDate: Date;
}

async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const response = await fetch(HELIUS_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'test', method, params }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`RPC Error: ${data.error.message}`);
  return data.result as T;
}

async function getDexScreenerData(mint: string): Promise<{ marketCap: number; volume24h: number; liquidity: number; dex: string } | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const data = await res.json();
    if (data.pairs && data.pairs.length > 0) {
      const pair = data.pairs[0];
      return {
        marketCap: pair.marketCap || pair.fdv || 0,
        volume24h: pair.volume?.h24 || 0,
        liquidity: pair.liquidity?.usd || 0,
        dex: pair.dexId || 'unknown',
      };
    }
  } catch {}
  return null;
}

// Scoring constants from scoring.ts
const SCORE = {
  MIGRATION_BONUS: 50,
  ATH_MAX: 30,
  ATH_DIVISOR: 100000,
  HOLDER_MAX: 20,
  DEV_BEHAVIOR_MAX: 20,
  BUNDLE_MAX: 15,
  LONGEVITY_MAX: 10,
  LONGEVITY_DAYS_PER_POINT: 7,
  COMMUNITY_MAX: 5,
  MAX_TOKEN_SCORE: 150,
  MAX_DEV_SCORE: 740,
};

function calculateTokenScore(token: TokenData): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    migration: 0,
    athMarketCap: 0,
    holderRetention: 10, // Default mid-range
    devBehavior: 10, // Default mid-range (benefit of doubt)
    bundleBehavior: 8, // Default mid-range
    longevity: 0,
    community: 0,
  };

  // Migration bonus
  if (token.migrated) {
    breakdown.migration = SCORE.MIGRATION_BONUS;
  }

  // ATH Market Cap score
  if (token.marketCap) {
    breakdown.athMarketCap = Math.min(SCORE.ATH_MAX, Math.floor(token.marketCap / SCORE.ATH_DIVISOR));
  }

  // Longevity
  const daysOld = Math.floor((Date.now() - token.launchDate.getTime()) / (1000 * 60 * 60 * 24));
  breakdown.longevity = Math.min(SCORE.LONGEVITY_MAX, Math.floor(daysOld / SCORE.LONGEVITY_DAYS_PER_POINT));

  // Community (if has liquidity, assume community exists)
  if (token.liquidity && token.liquidity > 10000) {
    breakdown.community = SCORE.COMMUNITY_MAX;
  }

  const total = Math.min(
    SCORE.MAX_TOKEN_SCORE,
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );

  return { score: total, breakdown };
}

async function main() {
  console.log('===========================================');
  console.log('DEVKARMA SCORE CALCULATION');
  console.log('Wallet:', WALLET);
  console.log('Testing COMBINED detection (DAS API + TX History)');
  console.log('===========================================\n');

  // 1. Compare detection methods
  console.log('Method 1: Standard DAS getAssetsByCreator...');
  const dasTokens = await getTokensCreatedByWallet(WALLET);
  console.log(`  Found ${dasTokens.length} tokens via DAS API\n`);

  console.log('Method 2: Combined detection (DAS + TX History)...');
  const allTokens = await getAllTokensCreatedByWallet(WALLET);
  console.log(`  Found ${allTokens.length} tokens via combined approach\n`);

  const newlyDetected = allTokens.filter(
    t => !dasTokens.find(d => d.mintAddress === t.mintAddress)
  );
  if (newlyDetected.length > 0) {
    console.log(`  NEW tokens detected via TX history: ${newlyDetected.length}`);
    for (const t of newlyDetected.slice(0, 5)) {
      console.log(`    - ${t.name} (${t.symbol})`);
    }
    console.log();
  }

  // 2. Scan ALL tokens for migration status (sequential with rate limiting)
  console.log('Scanning ALL tokens for migration status...');
  console.log('  (This may take a few minutes for large wallets)');
  const migratedTokens: Array<{ token: typeof allTokens[0]; migrationStatus: Awaited<ReturnType<typeof checkMigrationStatus>> }> = [];
  const nonMigratedSample: typeof allTokens = [];
  
  let checked = 0;
  for (const token of allTokens) {
    checked++;
    if (checked % 50 === 0) {
      process.stdout.write(`  Checked ${checked}/${allTokens.length} tokens... (${migratedTokens.length} migrated found)\r`);
    }
    
    try {
      const migrationStatus = await checkMigrationStatus(token.mintAddress);
      
      if (migrationStatus.migrated) {
        migratedTokens.push({ token, migrationStatus });
        console.log(`\n  ✓ Found migrated: ${token.name} (${token.symbol}) → ${migrationStatus.migrationType}`);
      } else if (nonMigratedSample.length < 10) {
        nonMigratedSample.push(token);
      }
    } catch (err) {
      // Rate limited - wait and retry
      await new Promise(r => setTimeout(r, 2000));
      try {
        const migrationStatus = await checkMigrationStatus(token.mintAddress);
        if (migrationStatus.migrated) {
          migratedTokens.push({ token, migrationStatus });
        }
      } catch {
        // Skip this token on error
      }
    }
    
    // Rate limiting: ~5 requests/second to stay under 300/min
    await new Promise(r => setTimeout(r, 220));
  }
  
  console.log(`\n  MIGRATED TOKENS FOUND: ${migratedTokens.length}`);
  for (const { token, migrationStatus } of migratedTokens) {
    console.log(`    ✓ ${token.name} (${token.symbol}) → ${migrationStatus.migrationType} | $${migrationStatus.liquidityUsd?.toLocaleString() || 0} liquidity`);
  }
  console.log();

  // 3. Get full market data for migrated tokens + sample of others
  console.log('Fetching detailed market data for migrated tokens...');
  const tokenData: TokenData[] = [];

  // Process migrated tokens first (these matter most for score)
  for (const { token, migrationStatus } of migratedTokens) {
    const marketData = await getTokenMarketData(token.mintAddress);
    
    tokenData.push({
      mint: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      marketCap: marketData?.marketCap || null,
      volume24h: marketData?.volume24h || null,
      liquidity: marketData?.liquidity || null,
      migrated: true,
      dex: migrationStatus.migrationType || null,
      launchDate: marketData?.pairCreatedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await new Promise(r => setTimeout(r, 100));
  }
  
  // Add sample of non-migrated tokens
  for (const token of nonMigratedSample) {
    const marketData = await getTokenMarketData(token.mintAddress);
    
    tokenData.push({
      mint: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      marketCap: marketData?.marketCap || null,
      volume24h: marketData?.volume24h || null,
      liquidity: marketData?.liquidity || null,
      migrated: false,
      dex: null,
      launchDate: marketData?.pairCreatedAt || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    await new Promise(r => setTimeout(r, 100));
  }

  // 3. Calculate scores
  console.log('\n--- TOKEN SCORES ---\n');

  const tokenScores: { name: string; symbol: string; score: number; migrated: boolean; marketCap: number | null }[] = [];

  for (const token of tokenData) {
    const { score, breakdown } = calculateTokenScore(token);
    tokenScores.push({
      name: token.name,
      symbol: token.symbol,
      score,
      migrated: token.migrated,
      marketCap: token.marketCap,
    });

    if (token.marketCap && token.marketCap > 100000) {
      console.log(`${token.name} (${token.symbol})`);
      console.log(`  Score: ${score}/150`);
      console.log(`  Market Cap: $${(token.marketCap / 1000000).toFixed(2)}M`);
      console.log(`  Migrated: ${token.migrated ? 'YES' : 'No'}`);
      console.log(`  DEX: ${token.dex || 'None'}`);
      console.log(`  Breakdown: Migration=${breakdown.migration}, ATH=${breakdown.athMarketCap}, Longevity=${breakdown.longevity}`);
      console.log();
    }
  }

  // 4. Calculate overall dev score
  const migratedCount = tokenScores.filter(t => t.migrated).length;
  const avgTokenScore = tokenScores.reduce((sum, t) => sum + t.score, 0) / tokenScores.length;

  // Weight by number of tokens
  const tokenWeight = Math.min(1, tokenScores.length / 5);
  const weightedScore = avgTokenScore * tokenWeight;

  // Convert to 740 scale
  const devScore = Math.min(SCORE.MAX_DEV_SCORE, Math.round(weightedScore * 5));

  // Determine tier
  let tier = 'Unverified';
  if (devScore >= 720 && migratedCount >= 5) tier = 'LEGEND';
  else if (devScore >= 700 && migratedCount >= 3) tier = 'Elite';
  else if (migratedCount >= 1) tier = 'Proven';
  else if (tokenScores.length >= 3) tier = 'Builder';
  else tier = 'Verified';

  console.log('===========================================');
  console.log('FINAL DEVKARMA SCORE');
  console.log('===========================================');
  console.log();
  console.log(`  SCORE: ${devScore} / 740`);
  console.log(`  TIER:  ${tier}`);
  console.log();
  console.log(`  Tokens Analyzed: ${tokenScores.length}`);
  console.log(`  Migrated Tokens: ${migratedCount}`);
  console.log(`  Avg Token Score: ${avgTokenScore.toFixed(1)}`);
  console.log();

  // Top tokens
  const topTokens = tokenScores
    .filter(t => t.marketCap && t.marketCap > 0)
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .slice(0, 5);

  if (topTokens.length > 0) {
    console.log('  TOP TOKENS BY MARKET CAP:');
    for (const t of topTokens) {
      const mcap = t.marketCap ? `$${(t.marketCap / 1000000).toFixed(2)}M` : 'N/A';
      console.log(`    - ${t.symbol}: ${mcap} (Score: ${t.score})`);
    }
  }

  console.log('\n===========================================');
}

main().catch(console.error);
