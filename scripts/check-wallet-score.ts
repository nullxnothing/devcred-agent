import 'dotenv/config';
import { Pool } from 'pg';

const wallet = process.argv[2] || '3Ag8qChr68VF2Ri2TUfphmSvpPLwqQaAiqt1J8NoBQTM';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get tokens for this wallet
  const { rows: tokens } = await pool.query(
    `SELECT name, score, migrated, status, ath_market_cap, market_cap, holder_count, rug_severity 
     FROM dk_tokens WHERE creator_wallet = $1`,
    [wallet]
  );
  
  console.log('=== TOKENS ===');
  for (const t of tokens) {
    console.log(`  ${t.name}: score=${t.score}, migrated=${t.migrated}, ATH=$${t.ath_market_cap}, holders=${t.holder_count}`);
  }
  
  // Get user score
  const { rows: user } = await pool.query(
    `SELECT u.total_score, u.tier FROM dk_users u
     JOIN dk_wallets w ON w.user_id = u.id
     WHERE w.address = $1`,
    [wallet]
  );
  
  console.log('\n=== USER SCORE ===');
  console.log(`  Total Score: ${user[0]?.total_score}`);
  console.log(`  Tier: ${user[0]?.tier}`);
  
  // Calculate what score should be with current algorithm
  const validTokens = tokens.filter((t: any) => t.status !== 'rug' && t.score >= 0);
  const migrationCount = validTokens.filter((t: any) => t.migrated).length;
  const avgScore = validTokens.reduce((sum: number, t: any) => sum + Number(t.score), 0) / validTokens.length;
  
  // Weighted average
  let weightedSum = 0;
  let totalWeight = 0;
  for (const token of validTokens) {
    const weight = Math.max(1, Number(token.score) / 10);
    weightedSum += Number(token.score) * weight;
    totalWeight += weight;
  }
  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  // Base score calc
  const BASE_MULTIPLIER = 5.5;
  const FIRST_MIGRATION_BONUS = 75;
  const MIGRATION_BONUS = 25;
  const MCAP_100K_BONUS = 25;
  const MCAP_500K_BONUS = 50;
  const MCAP_1M_BONUS = 75;
  const MCAP_10M_BONUS = 100;
  
  const baseScore = Math.round(weightedAverage * BASE_MULTIPLIER);
  
  let migrationBonus = 0;
  if (migrationCount >= 1) {
    migrationBonus = FIRST_MIGRATION_BONUS;
    if (migrationCount > 1) {
      migrationBonus += (migrationCount - 1) * MIGRATION_BONUS;
    }
  }
  
  let marketCapBonus = 0;
  for (const token of validTokens) {
    const ath = Number(token.ath_market_cap) || 0;
    if (ath >= 10_000_000) marketCapBonus += MCAP_10M_BONUS;
    else if (ath >= 1_000_000) marketCapBonus += MCAP_1M_BONUS;
    else if (ath >= 500_000) marketCapBonus += MCAP_500K_BONUS;
    else if (ath >= 100_000) marketCapBonus += MCAP_100K_BONUS;
  }
  
  const finalScore = baseScore + migrationBonus + marketCapBonus;
  
  console.log('\n=== SCORE BREAKDOWN ===');
  console.log(`  Token count: ${tokens.length}`);
  console.log(`  Migration count: ${migrationCount}`);
  console.log(`  Average token score: ${avgScore.toFixed(1)}`);
  console.log(`  Weighted average: ${weightedAverage.toFixed(1)}`);
  console.log(`  Base score (weighted * ${BASE_MULTIPLIER}): ${baseScore}`);
  console.log(`  Migration bonus: +${migrationBonus} (first: ${FIRST_MIGRATION_BONUS}, additional: ${MIGRATION_BONUS} each)`);
  console.log(`  Market cap bonus: +${marketCapBonus}`);
  console.log(`  CALCULATED TOTAL: ${finalScore}`);
  
  await pool.end();
}

main().catch(console.error);
