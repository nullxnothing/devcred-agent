/**
 * KOL Wallet Scanner - Scans KOL wallets for token creations
 * Creates system user profiles and links them to KOL records
 *
 * Usage: npx tsx scripts/scan-kol-wallets.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';
import type { Kol, Token, User } from '../types/database';

// Create pool with explicit connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const BATCH_SIZE = 5;
const DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// DB functions using local pool
async function getAllKols(limit = 100): Promise<Kol[]> {
  const result = await pool.query(
    `SELECT * FROM dk_kols
     ORDER BY kolscan_rank ASC NULLS LAST, pnl_sol DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

async function getWalletByAddress(address: string) {
  const result = await pool.query('SELECT * FROM dk_wallets WHERE address = $1', [address]);
  return result.rows[0] || null;
}

async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM dk_users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function createUser(user: { twitter_id: string; twitter_handle: string; twitter_name: string; avatar_url: string; bio: string; is_verified: boolean }): Promise<User> {
  const result = await pool.query(
    `INSERT INTO dk_users (twitter_id, twitter_handle, twitter_name, avatar_url, bio, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [user.twitter_id || null, user.twitter_handle, user.twitter_name, user.avatar_url || null, user.bio || null, user.is_verified ?? false]
  );
  return result.rows[0];
}

async function createWallet(wallet: { user_id: string; address: string; label: string; is_primary: boolean }) {
  const result = await pool.query(
    `INSERT INTO dk_wallets (user_id, address, label, is_primary, verified_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [wallet.user_id, wallet.address, wallet.label, wallet.is_primary ?? false]
  );
  return result.rows[0];
}

async function getOrCreateSystemUser(walletAddress: string): Promise<User> {
  const existingWallet = await getWalletByAddress(walletAddress);
  if (existingWallet && existingWallet.user_id) {
    const user = await getUserById(existingWallet.user_id);
    if (user) return user;
  }

  const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const systemUser = {
    twitter_id: '',
    twitter_handle: `dev_${walletAddress.slice(0, 8)}`,
    twitter_name: `Dev ${shortAddress}`,
    avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
    bio: `System-generated profile for ${walletAddress}`,
    is_verified: false,
  };

  try {
    const user = await createUser(systemUser);
    await createWallet({
      user_id: user.id,
      address: walletAddress,
      label: 'Primary Wallet',
      is_primary: true
    });
    return user;
  } catch {
    // Race condition - try to fetch again
    const result = await pool.query(
      'SELECT u.* FROM dk_users u JOIN dk_wallets w ON u.id = w.user_id WHERE w.address = $1',
      [walletAddress]
    );
    if (result.rows[0]) return result.rows[0];
    throw new Error('Failed to create or find system user');
  }
}

async function getTokensForUserWallets(userId: string): Promise<Token[]> {
  const result = await pool.query(
    `SELECT t.* FROM dk_tokens t
     INNER JOIN dk_wallets w ON t.creator_wallet = w.address
     WHERE w.user_id = $1
     ORDER BY t.launch_date DESC`,
    [userId]
  );
  return result.rows;
}

async function upsertToken(token: {
  mint_address: string;
  name: string;
  symbol: string;
  creator_wallet: string;
  user_id: string;
  launch_date: string;
  migrated?: boolean;
  migrated_at?: string;
  status?: string;
  score?: number;
  metadata?: Record<string, unknown>;
}): Promise<Token> {
  const result = await pool.query(
    `INSERT INTO dk_tokens (
       mint_address, name, symbol, creator_wallet, user_id, launch_date,
       migrated, migrated_at, status, score, metadata
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (mint_address) DO UPDATE SET
       name = EXCLUDED.name,
       symbol = EXCLUDED.symbol,
       migrated = EXCLUDED.migrated,
       migrated_at = EXCLUDED.migrated_at,
       status = EXCLUDED.status,
       score = EXCLUDED.score,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      token.mint_address,
      token.name,
      token.symbol,
      token.creator_wallet,
      token.user_id,
      token.launch_date,
      token.migrated ?? false,
      token.migrated_at,
      token.status ?? 'active',
      token.score ?? 0,
      token.metadata ? JSON.stringify(token.metadata) : null,
    ]
  );
  return result.rows[0];
}

async function updateUser(id: string, updates: { total_score?: number; tier?: string }): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id') {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  });

  if (fields.length === 0) return getUserById(id);

  values.push(id);
  const result = await pool.query(
    `UPDATE dk_users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

async function linkKolToUser(walletAddress: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE dk_kols SET user_id = $1, updated_at = NOW()
     WHERE wallet_address = $2`,
    [userId, walletAddress]
  );
  return (result.rowCount ?? 0) > 0;
}

// Import these dynamically after pool is created
let detectTokensCreatedByWallet: (wallet: string) => Promise<{
  tokens: Array<{
    mintAddress: string;
    name: string;
    symbol: string;
    creationTimestamp: number;
    creationSignature: string;
    confidence: string;
    creationMethod: string;
  }>;
}>;
let getMigratedTokensFromSwapHistory: (wallet: string, mints: Set<string>) => Promise<Map<string, { firstSwapTimestamp: number }>>;
let detectRugPattern: (wallet: string, mint: string, timestamp: number) => Promise<{ isRug: boolean; severity: 'soft' | 'hard' | null; sellPercent: number }>;
let calculateDevScore: (input: {
  tokens: Array<{
    score: number;
    migrated: boolean;
    launchDate: Date;
    athMarketCap?: number;
    status: 'active' | 'inactive' | 'rug';
    rugSeverity?: 'soft' | 'hard' | null;
  }>;
  walletCount: number;
  accountCreatedAt: Date;
}) => { score: number; tier: string };

async function loadDependencies() {
  const tokenDetection = await import('../lib/token-detection');
  const helius = await import('../lib/helius');
  const scoring = await import('../lib/scoring');

  detectTokensCreatedByWallet = tokenDetection.detectTokensCreatedByWallet;
  getMigratedTokensFromSwapHistory = helius.getMigratedTokensFromSwapHistory;
  detectRugPattern = helius.detectRugPattern;
  calculateDevScore = scoring.calculateDevScore;
}

async function scanKolWallet(kol: Kol): Promise<{
  tokensFound: number;
  userId: string | null;
}> {
  console.log(`\nScanning: ${kol.name} (${kol.wallet_address.slice(0, 8)}...)`);

  try {
    // Get or create system user for this wallet
    const user = await getOrCreateSystemUser(kol.wallet_address);

    // Link KOL to user if not already linked
    if (!kol.user_id) {
      await linkKolToUser(kol.wallet_address, user.id);
      console.log(`  Linked KOL to user: ${user.twitter_handle}`);
    }

    // Check if we already have tokens for this user
    const existingTokens = await getTokensForUserWallets(user.id);
    if (existingTokens.length > 0 && !process.argv.includes('--force')) {
      console.log(`  Already has ${existingTokens.length} tokens (use --force to rescan)`);
      return { tokensFound: existingTokens.length, userId: user.id };
    }

    // Scan wallet for token creations
    const scanResult = await detectTokensCreatedByWallet(kol.wallet_address);

    if (scanResult.tokens.length === 0) {
      console.log('  No token creations found');
      return { tokensFound: 0, userId: user.id };
    }

    console.log(`  Found ${scanResult.tokens.length} token creations`);

    // Get migration info
    const tokenMints = new Set(scanResult.tokens.map(t => t.mintAddress));
    const migratedTokens = await getMigratedTokensFromSwapHistory(kol.wallet_address, tokenMints);
    console.log(`  ${migratedTokens.size} migrated tokens`);

    // Upsert tokens to database
    for (const tokenData of scanResult.tokens) {
      const migrationInfo = migratedTokens.get(tokenData.mintAddress);

      // Detect rug pattern (best effort, don't block on failure)
      let rugDetection = { isRug: false, severity: null as 'soft' | 'hard' | null, sellPercent: 0 };
      try {
        rugDetection = await detectRugPattern(
          kol.wallet_address,
          tokenData.mintAddress,
          tokenData.creationTimestamp
        );
      } catch {
        // Ignore rug detection errors
      }

      await upsertToken({
        mint_address: tokenData.mintAddress,
        name: tokenData.name,
        symbol: tokenData.symbol,
        creator_wallet: kol.wallet_address,
        user_id: user.id,
        launch_date: tokenData.creationTimestamp
          ? new Date(tokenData.creationTimestamp * 1000).toISOString()
          : new Date().toISOString(),
        migrated: !!migrationInfo,
        migrated_at: migrationInfo
          ? new Date(migrationInfo.firstSwapTimestamp * 1000).toISOString()
          : undefined,
        status: rugDetection.isRug ? 'rug' : 'active',
        score: migrationInfo ? 50 : (rugDetection.isRug ? 0 : 10),
        metadata: {
          creation_signature: tokenData.creationSignature,
          creation_verified: tokenData.confidence === 'high',
          creation_method: tokenData.creationMethod,
          rug_severity: rugDetection.severity,
          dev_sell_percent: rugDetection.sellPercent,
        },
      });
    }

    // Get all tokens for user and calculate dev score
    const allTokens = await getTokensForUserWallets(user.id);

    const devScore = calculateDevScore({
      tokens: allTokens.map(t => ({
        score: t.score,
        migrated: t.migrated,
        launchDate: new Date(t.launch_date),
        athMarketCap: t.ath_market_cap || undefined,
        status: t.status as 'active' | 'inactive' | 'rug',
        rugSeverity: (t.metadata as { rug_severity?: 'soft' | 'hard' | null } | null)?.rug_severity,
      })),
      walletCount: 1,
      accountCreatedAt: new Date(user.created_at),
    });

    // Update user's total score
    await updateUser(user.id, {
      total_score: devScore.score,
      tier: devScore.tier,
    });

    console.log(`  Score: ${devScore.score} (${devScore.tier})`);

    return { tokensFound: scanResult.tokens.length, userId: user.id };

  } catch (error) {
    console.error(`  Error scanning ${kol.name}:`, error);
    return { tokensFound: 0, userId: null };
  }
}

async function main() {
  console.log('KOL Wallet Scanner\n');
  console.log('==================\n');

  // Load dependencies dynamically
  await loadDependencies();

  const kols = await getAllKols(100);

  if (kols.length === 0) {
    console.log('No KOLs found in database.');
    console.log('Run crawl-kols.ts first to populate the KOL table.');
    await pool.end();
    process.exit(1);
  }

  console.log(`Found ${kols.length} KOLs to scan`);

  let scanned = 0;
  let tokensFound = 0;
  let errors = 0;

  // Process in batches
  for (let i = 0; i < kols.length; i += BATCH_SIZE) {
    const batch = kols.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(kol => scanKolWallet(kol))
    );

    for (const result of results) {
      scanned++;
      tokensFound += result.tokensFound;
      if (result.userId === null) errors++;
    }

    // Progress update
    console.log(`\n--- Progress: ${scanned}/${kols.length} scanned ---`);

    // Delay between batches to respect rate limits
    if (i + BATCH_SIZE < kols.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n==================');
  console.log('Scan Complete');
  console.log('==================');
  console.log(`KOLs scanned: ${scanned}`);
  console.log(`Tokens found: ${tokensFound}`);
  console.log(`Errors: ${errors}`);

  await pool.end();
  process.exit(0);
}

main();
