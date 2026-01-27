/**
 * Seed Leaderboard Script
 * Scans known Solana dev wallets to populate the leaderboard
 * 
 * Usage: npx ts-node --transpile-only scripts/seed-leaderboard.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';

// Initialize DB connection - Railway PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

// Graduation threshold: 70k market cap = migrated from pump.fun
const GRADUATION_MARKET_CAP = 70000;

// Known active Solana token creator wallets from pump.fun
// These are public wallets that have launched tokens - mix of graduated and not
const SEED_WALLETS = [
  // Active pump.fun deployers with some graduated tokens
  'TSLvdd1pWpHVjahSpsvCXUbgwsL3JAcvokwaKt1eokM',
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
  'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
  'GVV4cLH8MYXkKUBHD1hLmvbykzN5JmMD3xKkbx6F9Srm',
  'FdmKUj3G2YJsbiCh7VLuNPj1dZgRqQKhQnYFPLMdGrXJ',
  '2gCzKgSTPSy4fL7z7FSkn7YYvFgAhJT5RFSMjxemsKRh',
  '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
  'BLhMUwGdaD5HnXvLvVRWZGqrLgx4PFAKZVuQHs6J7dEj',
  '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
  'G2YxRa6wXRgNEqFHuHxJLwcwYnXeEZnb9hWxdJjzJJQF',
  '4mKSoDDqApmF1DqXvVTSL6tu2zixrSSNjqMxUnwvVzy2',
  'FGxyNVhPDEP4wPmjqXwPfWJE3DkSLPAJxrTH2g9Mq9G5',
  '8hHDGfvGxD4TiWWPNnHQWnGYMPQvZJgUJvXVxfmyxS7V',
  '5bkfvhXsrWJvJgvEfLjPZPq6RPhLFLqb6Fj5iDHgEzJy',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
];

interface TokenData {
  mintAddress: string;
  name: string;
  symbol: string;
}

interface ScanResult {
  tokens: TokenData[];
  migrated: Map<string, { firstSwapTimestamp: number }>;
}

// Rate limiter
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Fetch tokens created by wallet using Helius DAS API
async function getTokensCreatedByWallet(walletAddress: string): Promise<ScanResult> {
  const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'seed-script',
        method: 'getAssetsByCreator',
        params: {
          creatorAddress: walletAddress,
          onlyVerified: false,
          page: 1,
          limit: 100,
        },
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      console.log(`  Helius error for ${walletAddress.slice(0,8)}...: ${data.error.message}`);
      return { tokens: [], migrated: new Map() };
    }

    const assets = data.result?.items || [];
    const tokens: TokenData[] = [];
    const migrated = new Map<string, { firstSwapTimestamp: number }>();

    for (const asset of assets) {
      if (asset.token_info?.supply > 0) {
        tokens.push({
          mintAddress: asset.id,
          name: asset.content?.metadata?.name || 'Unknown Token',
          symbol: asset.content?.metadata?.symbol || 'UNKNOWN',
        });
      }
    }

    // Check migration status for each token via DexScreener
    // Token is "graduated" if market cap >= 70k
    console.log(`  Checking ${Math.min(15, tokens.length)} tokens for graduation...`);
    for (const token of tokens.slice(0, 15)) { // Check first 15 tokens
      await sleep(350); // Rate limit - DexScreener allows 300/min
      try {
        const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.mintAddress}`);
        const dexData = await dexRes.json();
        
        if (dexData.pairs && dexData.pairs.length > 0) {
          const firstPair = dexData.pairs[0];
          const marketCap = firstPair.marketCap || firstPair.fdv || 0;
          
          // Graduated if market cap >= 70k (pump.fun graduation threshold)
          if (marketCap >= GRADUATION_MARKET_CAP) {
            migrated.set(token.mintAddress, {
              firstSwapTimestamp: firstPair.pairCreatedAt / 1000,
            });
            console.log(`    ✓ ${token.symbol}: $${(marketCap/1000).toFixed(1)}k - GRADUATED`);
          }
        }
      } catch (e) {
        // Skip on error
      }
    }

    return { tokens, migrated };
  } catch (error) {
    console.error(`  Error scanning ${walletAddress.slice(0,8)}...:`, error);
    return { tokens: [], migrated: new Map() };
  }
}

// Create system user for wallet
async function createSystemUser(walletAddress: string): Promise<string | null> {
  const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const handle = `dev_${walletAddress.slice(0, 8)}`;
  
  try {
    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM dk_users WHERE twitter_handle = $1',
      [handle]
    );
    
    if (existing.rows.length > 0) {
      console.log(`  User ${handle} already exists`);
      return existing.rows[0].id;
    }
    
    // Create user
    const userResult = await pool.query(
      `INSERT INTO dk_users (twitter_handle, twitter_name, avatar_url, bio, is_verified, total_score)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        handle,
        `Dev ${shortAddress}`,
        `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
        `Solana token creator wallet: ${walletAddress}`,
        false,
        0,
      ]
    );
    
    const userId = userResult.rows[0].id;
    
    // Create wallet
    await pool.query(
      `INSERT INTO dk_wallets (user_id, address, label, is_primary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (address) DO NOTHING`,
      [userId, walletAddress, 'Primary Wallet', true]
    );
    
    console.log(`  Created user ${handle} (${userId})`);
    return userId;
  } catch (error: any) {
    console.error(`  Error creating user for ${walletAddress.slice(0,8)}...:`, error.message);
    return null;
  }
}

// Add tokens to DB
async function addTokens(userId: string, walletAddress: string, scanResult: ScanResult) {
  for (const token of scanResult.tokens) {
    const migrationInfo = scanResult.migrated.get(token.mintAddress);
    const score = migrationInfo ? 50 : 10;
    
    try {
      await pool.query(
        `INSERT INTO dk_tokens (mint_address, name, symbol, creator_wallet, user_id, launch_date, migrated, migrated_at, score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (mint_address) DO UPDATE SET
           score = EXCLUDED.score,
           migrated = EXCLUDED.migrated`,
        [
          token.mintAddress,
          token.name,
          token.symbol,
          walletAddress,
          userId,
          migrationInfo ? new Date(migrationInfo.firstSwapTimestamp * 1000) : new Date(),
          !!migrationInfo,
          migrationInfo ? new Date(migrationInfo.firstSwapTimestamp * 1000) : null,
          score,
          'active',
        ]
      );
    } catch (e: any) {
      // Ignore duplicates
    }
  }
  console.log(`  Added ${scanResult.tokens.length} tokens`);
}

// Calculate and update dev score
async function updateDevScore(userId: string) {
  // Get all tokens for user
  const tokensResult = await pool.query(
    `SELECT score, migrated FROM dk_tokens WHERE user_id = $1`,
    [userId]
  );
  
  const tokens = tokensResult.rows;
  if (tokens.length === 0) return;
  
  // Calculate weighted average (simple version)
  const validScores = tokens.map(t => Number(t.score) || 0);
  const totalScore = validScores.reduce((sum, s) => sum + s, 0);
  const avgScore = tokens.length > 0 ? totalScore / tokens.length : 0;
  const migrationCount = tokens.filter(t => t.migrated).length;
  
  // Scale to 740 (5x multiplier capped)
  let devScore = Math.min(740, Math.round(avgScore * 5));
  
  // Bonus for migrations
  devScore = Math.min(740, devScore + migrationCount * 30);
  
  // Ensure valid number
  if (isNaN(devScore)) devScore = 0;
  
  await pool.query(
    'UPDATE dk_users SET total_score = $1 WHERE id = $2',
    [devScore, userId]
  );
  
  console.log(`  Updated score to ${devScore} (${tokens.length} tokens, ${migrationCount} migrations)`);
}

// Update all ranks
async function updateAllRanks() {
  await pool.query(`
    WITH ranked AS (
      SELECT DISTINCT u.id,
             ROW_NUMBER() OVER (ORDER BY u.total_score DESC, u.created_at ASC) as new_rank
      FROM dk_users u
      INNER JOIN dk_wallets w ON u.id = w.user_id
    )
    UPDATE dk_users
    SET rank = ranked.new_rank
    FROM ranked
    WHERE dk_users.id = ranked.id
  `);
  console.log('Updated all ranks');
}

// Main
async function main() {
  console.log('🌱 DevKarma Leaderboard Seeder');
  console.log('==============================\n');
  
  if (!process.env.HELIUS_API_KEY) {
    console.error('❌ HELIUS_API_KEY not found in environment');
    process.exit(1);
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  console.log(`Scanning ${SEED_WALLETS.length} wallets...\n`);
  
  let successCount = 0;
  
  for (const wallet of SEED_WALLETS) {
    console.log(`\n📍 Scanning wallet: ${wallet.slice(0, 8)}...${wallet.slice(-4)}`);
    
    // Rate limit between wallets
    await sleep(1000);
    
    // Scan wallet for tokens
    const scanResult = await getTokensCreatedByWallet(wallet);
    
    if (scanResult.tokens.length === 0) {
      console.log('  No tokens found, skipping...');
      continue;
    }
    
    console.log(`  Found ${scanResult.tokens.length} tokens, ${scanResult.migrated.size} migrated`);
    
    // Create user
    const userId = await createSystemUser(wallet);
    if (!userId) continue;
    
    // Add tokens
    await addTokens(userId, wallet, scanResult);
    
    // Update score
    await updateDevScore(userId);
    
    successCount++;
  }
  
  // Update all ranks
  console.log('\n📊 Updating leaderboard ranks...');
  await updateAllRanks();
  
  // Show final leaderboard
  console.log('\n🏆 Current Leaderboard:');
  const leaderboard = await pool.query(`
    SELECT u.twitter_handle, u.total_score, u.rank,
           (SELECT COUNT(*) FROM dk_tokens WHERE user_id = u.id) as token_count
    FROM dk_users u
    INNER JOIN dk_wallets w ON u.id = w.user_id
    ORDER BY u.total_score DESC
    LIMIT 10
  `);
  
  console.log('');
  for (const row of leaderboard.rows) {
    console.log(`  #${row.rank} ${row.twitter_handle}: ${row.total_score} pts (${row.token_count} tokens)`);
  }
  
  console.log(`\n✅ Done! Seeded ${successCount} developers.`);
  
  await pool.end();
}

main().catch(console.error);
