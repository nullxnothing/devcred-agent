import { config } from 'dotenv';
config({ path: '.env.local' });

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const result = await pool.query(
    `SELECT * FROM dk_tokens WHERE mint_address = '2mESiwuVdfft9PxG7x36rvDvex6ccyY8m8BKCWJqpump'`
  );

  const token = result.rows[0];
  console.log('Token details:');
  console.log(`  Name: ${token.name}`);
  console.log(`  Score: ${token.score}`);
  console.log(`  Migrated: ${token.migrated}`);
  console.log(`  Status: ${token.status}`);
  console.log(`  ATH Market Cap: $${token.ath_market_cap}`);
  console.log(`  Current Market Cap: $${token.current_market_cap}`);
  console.log(`  Holder Count: ${token.holder_count}`);
  console.log(`  Launch Date: ${token.launch_date}`);
  console.log(`  Rug Severity: ${token.rug_severity}`);

  // Calculate what the score SHOULD be based on scoring.ts logic
  console.log('\n--- Expected Score Breakdown ---');

  // Migration (0-30): migrated = 30
  const migration = token.migrated ? 30 : 0;
  console.log(`  Migration: ${migration}/30 (migrated: ${token.migrated})`);

  // Traction (0-25): based on ATH
  const ath = token.ath_market_cap || 0;
  let traction = 0;
  if (ath >= 10_000_000) traction = 25;
  else if (ath >= 1_000_000) traction = 20;
  else if (ath >= 500_000) traction = 15;
  else if (ath >= 100_000) traction = 10;
  else if (ath >= 50_000) traction = 5;
  else if (ath >= 10_000) traction = 2;
  console.log(`  Traction: ${traction}/25 (ATH: $${ath})`);

  // Holder Retention (0-20)
  const holders = token.holder_count || 0;
  let holderRetention = 0;
  if (holders >= 5000) holderRetention = 20;
  else if (holders >= 1000) holderRetention = 15;
  else if (holders >= 500) holderRetention = 10;
  else if (holders >= 100) holderRetention = 5;
  else if (holders >= 50) holderRetention = 2;
  console.log(`  Holder Retention: ${holderRetention}/20 (holders: ${holders})`);

  // Dev Behavior (0-15): assume neutral 10
  const devBehavior = 10;
  console.log(`  Dev Behavior: ${devBehavior}/15 (assumed neutral)`);

  // Longevity (0-10)
  const launchDate = new Date(token.launch_date);
  const ageInDays = (Date.now() - launchDate.getTime()) / (1000 * 60 * 60 * 24);
  let longevity = 0;
  if (ageInDays >= 90) longevity = 10;
  else if (ageInDays >= 30) longevity = 7;
  else if (ageInDays >= 7) longevity = 4;
  else if (ageInDays >= 1) longevity = 1;
  console.log(`  Longevity: ${longevity}/10 (${Math.round(ageInDays)} days old)`);

  const expectedScore = migration + traction + holderRetention + devBehavior + longevity;
  console.log(`\n  EXPECTED TOTAL: ${expectedScore}/100`);
  console.log(`  CURRENT DB SCORE: ${token.score}`);

  await pool.end();
}

main();
