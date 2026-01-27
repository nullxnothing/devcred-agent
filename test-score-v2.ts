/**
 * DevKarma Score Calculator - EFFICIENT VERSION
 * Uses Helius Enhanced Transactions API for fast migration detection
 * Run with: npx tsx test-score-v2.ts [wallet_address]
 */

import 'dotenv/config';
import { getTokensWithMigrationStatus, MigratedTokenInfo, TokenCreated } from './lib/helius';
import { getTokenMarketData, checkMigrationStatus } from './lib/dexscreener';

// Default test wallet or use CLI arg
const WALLET = process.argv[2] || 'CFqsrQbvhb1Z3XKHVAZg6sovZzTg5NN9X9RnTf3D2BBZ';

// Scoring constants
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

interface TokenScoreData {
  mint: string;
  name: string;
  symbol: string;
  migrated: boolean;
  marketCap: number | null;
  liquidity: number | null;
  score: number;
  breakdown: Record<string, number>;
}

function calculateTokenScore(
  token: TokenCreated,
  migrationInfo: MigratedTokenInfo | undefined,
  marketData: { marketCap?: number; liquidity?: number; pairCreatedAt?: Date } | null
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {
    migration: 0,
    athMarketCap: 0,
    holderRetention: 10,
    devBehavior: 10,
    bundleBehavior: 8,
    longevity: 0,
    community: 0,
  };

  // Migration bonus (biggest factor!)
  if (migrationInfo) {
    breakdown.migration = SCORE.MIGRATION_BONUS;
  }

  // ATH Market Cap score
  if (marketData?.marketCap) {
    breakdown.athMarketCap = Math.min(SCORE.ATH_MAX, Math.floor(marketData.marketCap / SCORE.ATH_DIVISOR));
  }

  // Longevity
  const launchDate = marketData?.pairCreatedAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const daysOld = Math.floor((Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24));
  breakdown.longevity = Math.min(SCORE.LONGEVITY_MAX, Math.floor(daysOld / SCORE.LONGEVITY_DAYS_PER_POINT));

  // Community (if has liquidity > $10K, assume community exists)
  if (marketData?.liquidity && marketData.liquidity > 10000) {
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
  console.log('DEVKARMA SCORE CALCULATOR v2');
  console.log('Using Helius Enhanced Transactions API');
  console.log('===========================================');
  console.log('Wallet:', WALLET);
  console.log('');

  console.time('Total analysis time');

  // Step 1: Efficient token + migration detection via Helius
  console.log('Step 1: Detecting tokens and migrations via Helius...');
  const { tokens, migrated, totalTokens, migratedCount } = await getTokensWithMigrationStatus(WALLET);
  
  console.log(`  ✓ Found ${totalTokens} tokens`);
  console.log(`  ✓ Found ${migratedCount} migrated tokens via swap history`);
  console.log('');

  // Step 2: Get market data for migrated tokens (only these matter for high scores)
  console.log('Step 2: Fetching market data for migrated tokens...');
  const tokenScores: TokenScoreData[] = [];

  for (const [mintAddress, migrationInfo] of migrated) {
    const token = tokens.find(t => t.mintAddress === mintAddress);
    if (!token) continue;

    // Get market data from DexScreener (only for migrated tokens)
    const marketData = await getTokenMarketData(mintAddress);
    
    const { score, breakdown } = calculateTokenScore(token, migrationInfo, marketData);
    
    tokenScores.push({
      mint: mintAddress,
      name: token.name,
      symbol: token.symbol,
      migrated: true,
      marketCap: marketData?.marketCap || null,
      liquidity: marketData?.liquidity || null,
      score,
      breakdown,
    });

    console.log(`  ✓ ${token.name} (${token.symbol}): Score ${score}/150 | MCap $${(marketData?.marketCap || 0).toLocaleString()}`);
    
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }

  // Add a sample of non-migrated tokens (lower score contribution)
  const nonMigratedSample = tokens
    .filter(t => !migrated.has(t.mintAddress))
    .slice(0, 10);
  
  for (const token of nonMigratedSample) {
    const { score, breakdown } = calculateTokenScore(token, undefined, null);
    tokenScores.push({
      mint: token.mintAddress,
      name: token.name,
      symbol: token.symbol,
      migrated: false,
      marketCap: null,
      liquidity: null,
      score,
      breakdown,
    });
  }

  console.timeEnd('Total analysis time');
  console.log('');

  // Step 3: Calculate overall dev score
  const migratedTokenScores = tokenScores.filter(t => t.migrated);
  const avgMigratedScore = migratedTokenScores.length > 0
    ? migratedTokenScores.reduce((sum, t) => sum + t.score, 0) / migratedTokenScores.length
    : 0;
  
  // Weight by number of migrated tokens (more = better)
  const migrationMultiplier = Math.min(5, migratedCount);
  const baseScore = avgMigratedScore * migrationMultiplier;
  
  // Convert to 740 scale
  const devScore = Math.min(SCORE.MAX_DEV_SCORE, Math.round(baseScore));

  // Determine tier
  let tier = 'Unverified';
  if (devScore >= 700 && migratedCount >= 5) tier = 'LEGEND';
  else if (devScore >= 500 && migratedCount >= 3) tier = 'Elite';
  else if (migratedCount >= 1) tier = 'Proven';
  else if (totalTokens >= 3) tier = 'Builder';
  else tier = 'Verified';

  console.log('===========================================');
  console.log('FINAL DEVKARMA RESULTS');
  console.log('===========================================');
  console.log('');
  console.log(`  SCORE: ${devScore} / 740`);
  console.log(`  TIER:  ${tier}`);
  console.log('');
  console.log(`  Total Tokens Created: ${totalTokens}`);
  console.log(`  Migrated Tokens: ${migratedCount}`);
  console.log(`  Avg Migrated Token Score: ${avgMigratedScore.toFixed(1)}`);
  console.log('');

  // Top migrated tokens
  if (migratedTokenScores.length > 0) {
    console.log('  TOP MIGRATED TOKENS:');
    const sorted = migratedTokenScores.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    for (const t of sorted.slice(0, 5)) {
      const mcap = t.marketCap ? `$${t.marketCap.toLocaleString()}` : 'N/A';
      console.log(`    - ${t.symbol}: ${mcap} (Score: ${t.score})`);
    }
  }

  console.log('');
  console.log('===========================================');
}

main().catch(console.error);
