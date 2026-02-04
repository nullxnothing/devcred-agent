import { Pool } from 'pg';
import { User, Wallet, Token, ScoreHistory, ProfileView, NewUser, NewWallet, NewToken, Kol, NewKol } from '@/types/database';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway PostgreSQL uses self-signed certs, so we must allow them
  // This is acceptable for Railway's internal network but not ideal
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 30, // Increased for parallel query patterns
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

let isShuttingDown = false;

export async function healthCheck(): Promise<boolean> {
  if (isShuttingDown) return false;

  try {
    const result = await pool.query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch {
    return false;
  }
}

export async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log('Closing database pool...');

  try {
    await pool.end();
    console.log('Database pool closed');
  } catch (error) {
    console.error('Error closing database pool:', error);
  }
}

if (typeof process !== 'undefined') {
  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
}

// Users
export async function getUserByTwitterHandle(handle: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE LOWER(twitter_handle) = LOWER($1)',
    [handle]
  );
  return result.rows[0] || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await pool.query('SELECT * FROM dk_users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getUserByTwitterId(twitterId: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE twitter_id = $1',
    [twitterId]
  );
  return result.rows[0] || null;
}

export async function createUser(user: NewUser): Promise<User> {
  const result = await pool.query(
    `INSERT INTO dk_users (twitter_id, twitter_handle, twitter_name, avatar_url, bio, is_verified, primary_wallet)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user.twitter_id || null, 
      user.twitter_handle || null, 
      user.twitter_name || null, 
      user.avatar_url || null, 
      user.bio || null,
      user.is_verified ?? false,
      user.primary_wallet || null
    ]
  );
  return result.rows[0];
}

/**
 * Get user by their primary wallet address (wallet-first auth)
 */
export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE primary_wallet = $1',
    [walletAddress]
  );
  return result.rows[0] || null;
}

/**
 * Get user by any wallet address (primary or linked via dk_wallets)
 * Single query with JOIN - replaces 3 sequential queries
 */
export async function getUserByAnyWallet(walletAddress: string): Promise<User | null> {
  const result = await pool.query(
    `SELECT u.* FROM dk_users u
     LEFT JOIN dk_wallets w ON u.id = w.user_id
     WHERE u.primary_wallet = $1 OR w.address = $1
     LIMIT 1`,
    [walletAddress]
  );
  return result.rows[0] || null;
}

/**
 * Get user by their pump.fun username
 */
export async function getUserByPumpFunUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE pumpfun_username = $1',
    [username]
  );
  return result.rows[0] || null;
}

/**
 * Create a new user from wallet address (wallet-first auth)
 * This is the primary way to create new users
 */
export async function createUserFromWallet(walletAddress: string): Promise<User> {
  const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  
  const result = await pool.query(
    `INSERT INTO dk_users (
       twitter_id, twitter_handle, twitter_name, avatar_url, bio, 
       is_verified, primary_wallet
     )
     VALUES (NULL, $1, $2, $3, NULL, TRUE, $4)
     RETURNING *`,
    [
      `dev_${walletAddress.slice(0, 8)}`, // generated handle
      `Dev ${shortAddress}`, // display name
      `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`, // avatar
      walletAddress // primary_wallet
    ]
  );
  
  const user = result.rows[0];
  
  // Also create entry in dk_wallets for consistency
  await createWallet({
    user_id: user.id,
    address: walletAddress,
    label: 'Primary Wallet',
    is_primary: true
  });
  
  return user;
}

/**
 * Link Twitter account to existing wallet-based user
 */
export async function linkTwitterToUser(
  userId: string, 
  twitterId: string, 
  twitterHandle: string, 
  twitterName: string, 
  avatarUrl?: string
): Promise<User | null> {
  const result = await pool.query(
    `UPDATE dk_users 
     SET twitter_id = $1, twitter_handle = $2, twitter_name = $3, avatar_url = COALESCE($4, avatar_url), updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [twitterId, twitterHandle, twitterName, avatarUrl, userId]
  );
  return result.rows[0] || null;
}

/**
 * Unlink Twitter account from user
 */
export async function unlinkTwitterFromUser(userId: string): Promise<User | null> {
  const result = await pool.query(
    `UPDATE dk_users 
     SET twitter_id = NULL, twitter_handle = NULL, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Creates a system-generated user for a wallet that hasn't been claimed yet.
 * @deprecated Use createUserFromWallet for new wallet-first auth
 */
export async function getOrCreateSystemUser(walletAddress: string): Promise<User> {
  // Single query to find user by primary_wallet OR linked wallet
  const existingUser = await getUserByAnyWallet(walletAddress);
  if (existingUser) return existingUser;

  // Create new user with wallet-first approach
  return createUserFromWallet(walletAddress);
}

// Whitelist of allowed columns for updateUser to prevent SQL injection
const ALLOWED_USER_UPDATE_COLUMNS = new Set([
  'twitter_id',
  'twitter_handle',
  'twitter_name',
  'avatar_url',
  'bio',
  'total_score',
  'is_verified',
  'rank',
  'tier',
  'primary_wallet',
  'pumpfun_username',
  'scraped_at',
]);

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined && key !== 'id' && ALLOWED_USER_UPDATE_COLUMNS.has(key)) {
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

// Wallets
export async function getWalletsByUserId(userId: string): Promise<Wallet[]> {
  const result = await pool.query(
    'SELECT * FROM dk_wallets WHERE user_id = $1 ORDER BY is_primary DESC, created_at ASC',
    [userId]
  );
  return result.rows;
}

export async function getWalletByAddress(address: string): Promise<Wallet | null> {
  const result = await pool.query('SELECT * FROM dk_wallets WHERE address = $1', [address]);
  return result.rows[0] || null;
}

export async function createWallet(wallet: NewWallet): Promise<Wallet> {
  const result = await pool.query(
    `INSERT INTO dk_wallets (user_id, address, label, is_primary, verified_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING *`,
    [wallet.user_id, wallet.address, wallet.label, wallet.is_primary ?? false]
  );
  return result.rows[0];
}

export async function deleteWallet(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM dk_wallets WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteWalletByAddress(address: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM dk_wallets WHERE address = $1 AND user_id = $2',
    [address, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function setWalletPrimary(id: string, userId: string): Promise<boolean> {
  // First, unset all other wallets as primary
  await pool.query(
    'UPDATE dk_wallets SET is_primary = FALSE WHERE user_id = $1',
    [userId]
  );
  // Then set the selected wallet as primary
  const result = await pool.query(
    'UPDATE dk_wallets SET is_primary = TRUE WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Tokens
export async function getTokensByCreatorWallet(walletAddress: string): Promise<Token[]> {
  const result = await pool.query(
    'SELECT * FROM dk_tokens WHERE creator_wallet = $1 ORDER BY launch_date DESC',
    [walletAddress]
  );
  return result.rows;
}

export async function getTokensByUserId(userId: string): Promise<Token[]> {
  const result = await pool.query(
    'SELECT * FROM dk_tokens WHERE user_id = $1 ORDER BY launch_date DESC',
    [userId]
  );
  return result.rows;
}

export async function getTokenByMint(mintAddress: string): Promise<Token | null> {
  const result = await pool.query(
    'SELECT * FROM dk_tokens WHERE mint_address = $1',
    [mintAddress]
  );
  return result.rows[0] || null;
}

export async function upsertToken(token: NewToken): Promise<Token> {
  const result = await pool.query(
    `INSERT INTO dk_tokens (
       mint_address, name, symbol, creator_wallet, user_id, launch_date,
       migrated, migrated_at, ath_market_cap, current_market_cap, total_volume,
       holder_count, status, score, metadata, creation_signature, creation_verified,
       migration_pool_address, rug_severity, dev_sell_percent
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     ON CONFLICT (mint_address) DO UPDATE SET
       name = EXCLUDED.name,
       symbol = EXCLUDED.symbol,
       migrated = EXCLUDED.migrated,
       migrated_at = EXCLUDED.migrated_at,
       ath_market_cap = EXCLUDED.ath_market_cap,
       current_market_cap = EXCLUDED.current_market_cap,
       total_volume = EXCLUDED.total_volume,
       holder_count = EXCLUDED.holder_count,
       status = EXCLUDED.status,
       score = EXCLUDED.score,
       metadata = EXCLUDED.metadata,
       creation_signature = COALESCE(EXCLUDED.creation_signature, dk_tokens.creation_signature),
       creation_verified = COALESCE(EXCLUDED.creation_verified, dk_tokens.creation_verified),
       migration_pool_address = COALESCE(EXCLUDED.migration_pool_address, dk_tokens.migration_pool_address),
       rug_severity = COALESCE(EXCLUDED.rug_severity, dk_tokens.rug_severity),
       dev_sell_percent = COALESCE(EXCLUDED.dev_sell_percent, dk_tokens.dev_sell_percent),
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
      token.ath_market_cap,
      token.current_market_cap,
      token.total_volume,
      token.holder_count,
      token.status ?? 'active',
      token.score ?? 0,
      token.metadata ? JSON.stringify(token.metadata) : null,
      token.creation_signature,
      token.creation_verified ?? false,
      token.migration_pool_address,
      token.rug_severity,
      token.dev_sell_percent,
    ]
  );
  return result.rows[0];
}

export async function getTokensForUserWallets(userId: string): Promise<Token[]> {
  // Use user_id directly (faster) with fallback to wallet join for legacy tokens
  const result = await pool.query(
    `SELECT DISTINCT t.* FROM dk_tokens t
     LEFT JOIN dk_wallets w ON t.creator_wallet = w.address AND w.user_id = $1
     WHERE t.user_id = $1 OR w.user_id = $1
     ORDER BY t.launch_date DESC`,
    [userId]
  );
  return result.rows;
}

// Score History
export async function getScoreHistory(userId: string, limit = 30): Promise<ScoreHistory[]> {
  const result = await pool.query(
    'SELECT * FROM dk_score_history WHERE user_id = $1 ORDER BY calculated_at DESC LIMIT $2',
    [userId, limit]
  );
  return result.rows;
}

export async function addScoreHistory(
  userId: string,
  score: number,
  breakdown: Record<string, unknown>
): Promise<ScoreHistory> {
  const result = await pool.query(
    `INSERT INTO dk_score_history (user_id, score, score_breakdown)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, score, JSON.stringify(breakdown)]
  );
  return result.rows[0];
}

// Profile Views
export async function recordProfileView(
  userId: string,
  viewerIp?: string,
  viewerUserId?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO dk_profile_views (user_id, viewer_ip, viewer_user_id)
     VALUES ($1, $2, $3)`,
    [userId, viewerIp, viewerUserId]
  );
}

export async function getProfileViewCount(userId: string, days = 30): Promise<number> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM dk_profile_views
     WHERE user_id = $1 AND viewed_at > NOW() - INTERVAL '1 day' * $2`,
    [userId, days]
  );
  return parseInt(result.rows[0].count, 10);
}

// Leaderboard - shows all users that have been scanned (have wallets)
export async function getLeaderboard(limit = 100): Promise<User[]> {
  const result = await pool.query(
    `SELECT DISTINCT u.* FROM dk_users u
     INNER JOIN dk_wallets w ON u.id = w.user_id
     ORDER BY u.total_score DESC, u.created_at ASC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

// Update ranks for all users with wallets
export async function updateRanks(): Promise<void> {
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
}

// Update a single user's rank (faster for single updates)
export async function updateUserRank(userId: string): Promise<number | null> {
  // Calculate rank based on score position
  const result = await pool.query(`
    WITH ranked AS (
      SELECT DISTINCT u.id,
             ROW_NUMBER() OVER (ORDER BY u.total_score DESC, u.created_at ASC) as new_rank
      FROM dk_users u
      INNER JOIN dk_wallets w ON u.id = w.user_id
    )
    UPDATE dk_users
    SET rank = ranked.new_rank
    FROM ranked
    WHERE dk_users.id = ranked.id AND dk_users.id = $1
    RETURNING dk_users.rank
  `, [userId]);
  return result.rows[0]?.rank || null;
}

// Search users by handle
export async function searchUsers(query: string, limit = 10): Promise<User[]> {
  const result = await pool.query(
    `SELECT * FROM dk_users
     WHERE twitter_handle ILIKE $1 OR twitter_name ILIKE $1
     ORDER BY total_score DESC
     LIMIT $2`,
    [`%${query}%`, limit]
  );
  return result.rows;
}

// Upsert user from scraped Axiom data
export interface ScrapedUserData {
  total_score: number;
  tier: string;
  token_count?: number;
  migration_count?: number;
  rug_count?: number;
  top_mcap?: number | null;
  scraped_at?: string;
}

export async function upsertUserByWallet(walletAddress: string, data: ScrapedUserData): Promise<User> {
  // Check if user exists
  const existing = await getUserByWallet(walletAddress);

  if (existing) {
    // Update existing user with all scraped fields
    const result = await pool.query(
      `UPDATE dk_users
       SET total_score = $1, tier = $2, scraped_at = $3,
           token_count = COALESCE($5, token_count),
           migration_count = COALESCE($6, migration_count),
           rug_count = COALESCE($7, rug_count),
           top_mcap = COALESCE($8, top_mcap),
           updated_at = NOW()
       WHERE primary_wallet = $4
       RETURNING *`,
      [
        data.total_score,
        data.tier,
        data.scraped_at || new Date().toISOString(),
        walletAddress,
        data.token_count ?? null,
        data.migration_count ?? null,
        data.rug_count ?? null,
        data.top_mcap ?? null
      ]
    );
    return result.rows[0];
  }

  // Create new user with wallet
  const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

  const result = await pool.query(
    `INSERT INTO dk_users (
       twitter_handle, twitter_name, avatar_url,
       is_verified, primary_wallet, total_score, tier, scraped_at,
       token_count, migration_count, rug_count, top_mcap
     )
     VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      `dev_${walletAddress.slice(0, 8)}`,
      `Dev ${shortAddress}`,
      `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
      walletAddress,
      data.total_score,
      data.tier,
      data.scraped_at || new Date().toISOString(),
      data.token_count ?? 0,
      data.migration_count ?? 0,
      data.rug_count ?? 0,
      data.top_mcap ?? null
    ]
  );

  const user = result.rows[0];

  // Create associated wallet record
  await createWallet({
    user_id: user.id,
    address: walletAddress,
    label: 'Primary Wallet',
    is_primary: true
  });

  return user;
}

// KOLs (Key Opinion Leaders)
export async function getKolByWallet(walletAddress: string): Promise<Kol | null> {
  const result = await pool.query(
    'SELECT * FROM dk_kols WHERE wallet_address = $1',
    [walletAddress]
  );
  return result.rows[0] || null;
}

export async function getKolByUserId(userId: string): Promise<Kol | null> {
  const result = await pool.query(
    'SELECT * FROM dk_kols WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

export async function getAllKols(limit = 100): Promise<Kol[]> {
  const result = await pool.query(
    `SELECT * FROM dk_kols
     ORDER BY kolscan_rank ASC NULLS LAST, pnl_sol DESC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export interface KolWithUser extends Kol {
  user_total_score: number | null;
  user_twitter_handle: string | null;
  user_twitter_name: string | null;
  user_avatar_url: string | null;
  user_rank: number | null;
  user_tier: string | null;
  user_is_verified: boolean | null;
}

export async function getKolsWithUsers(limit = 100): Promise<KolWithUser[]> {
  const result = await pool.query(
    `SELECT k.*,
            u.total_score as user_total_score,
            u.twitter_handle as user_twitter_handle,
            u.twitter_name as user_twitter_name,
            u.avatar_url as user_avatar_url,
            u.rank as user_rank,
            u.tier as user_tier,
            u.is_verified as user_is_verified
     FROM dk_kols k
     LEFT JOIN dk_users u ON k.user_id = u.id
     ORDER BY u.total_score DESC NULLS LAST, k.kolscan_rank ASC NULLS LAST
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function upsertKol(kol: NewKol): Promise<Kol> {
  const result = await pool.query(
    `INSERT INTO dk_kols (
       wallet_address, name, twitter_url, telegram_url,
       kolscan_rank, pnl_sol, wins, losses, user_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (wallet_address) DO UPDATE SET
       name = EXCLUDED.name,
       twitter_url = COALESCE(EXCLUDED.twitter_url, dk_kols.twitter_url),
       telegram_url = COALESCE(EXCLUDED.telegram_url, dk_kols.telegram_url),
       kolscan_rank = EXCLUDED.kolscan_rank,
       pnl_sol = EXCLUDED.pnl_sol,
       wins = EXCLUDED.wins,
       losses = EXCLUDED.losses,
       updated_at = NOW()
     RETURNING *`,
    [
      kol.wallet_address,
      kol.name,
      kol.twitter_url || null,
      kol.telegram_url || null,
      kol.kolscan_rank || null,
      kol.pnl_sol || null,
      kol.wins || 0,
      kol.losses || 0,
      kol.user_id || null,
    ]
  );
  return result.rows[0];
}

export async function linkKolToUser(walletAddress: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `UPDATE dk_kols SET user_id = $1, updated_at = NOW()
     WHERE wallet_address = $2`,
    [userId, walletAddress]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getKolCount(): Promise<number> {
  const result = await pool.query('SELECT COUNT(*) as count FROM dk_kols');
  return parseInt(result.rows[0].count, 10);
}

export async function isUserKol(userId: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT 1 FROM dk_kols WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  return result.rows.length > 0;
}

export async function getKolStatusForUsers(userIds: string[]): Promise<Map<string, boolean>> {
  if (userIds.length === 0) return new Map();

  const result = await pool.query(
    `SELECT user_id FROM dk_kols WHERE user_id = ANY($1)`,
    [userIds]
  );

  const kolUserIds = new Set(result.rows.map(r => r.user_id));
  const statusMap = new Map<string, boolean>();

  for (const userId of userIds) {
    statusMap.set(userId, kolUserIds.has(userId));
  }

  return statusMap;
}

export { pool };
