import { Pool } from 'pg';
import { User, Wallet, Token, ScoreHistory, ProfileView, NewUser, NewWallet, NewToken } from '@/types/database';

// Railway PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

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
    `INSERT INTO dk_users (twitter_id, twitter_handle, twitter_name, avatar_url, bio, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      user.twitter_id || null, 
      user.twitter_handle, 
      user.twitter_name, 
      user.avatar_url || null, 
      user.bio || null,
      user.is_verified ?? false
    ]
  );
  return result.rows[0];
}

/**
 * Creates a system-generated user for a wallet that hasn't been claimed yet.
 */
export async function getOrCreateSystemUser(walletAddress: string): Promise<User> {
  // Check if a user already owns this wallet
  const existingWallet = await getWalletByAddress(walletAddress);
  if (existingWallet && existingWallet.user_id) {
    const user = await getUserById(existingWallet.user_id);
    if (user) return user;
  }

  // Create a new system user
  const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
  const systemUser: NewUser = {
    twitter_id: '', // Will be NULL in DB after migration
    twitter_handle: `dev_${walletAddress.slice(0, 8)}`,
    twitter_name: `Dev ${shortAddress}`,
    avatar_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
    bio: `System-generated profile for ${walletAddress}`,
  };

  try {
    const user = await createUser({ ...systemUser, is_verified: false });
    
    // Create the wallet entry for this user
    await createWallet({
      user_id: user.id,
      address: walletAddress,
      label: 'Primary Wallet',
      is_primary: true
    });

    return user;
  } catch (error) {
    // If failed due to race condition, try to fetch again
    const user = await getUserByTwitterHandle(systemUser.twitter_handle);
    if (user) return user;
    throw error;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
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
    `INSERT INTO dk_tokens (mint_address, name, symbol, creator_wallet, user_id, launch_date, migrated, migrated_at, ath_market_cap, current_market_cap, total_volume, holder_count, status, score, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
    ]
  );
  return result.rows[0];
}

export async function getTokensForUserWallets(userId: string): Promise<Token[]> {
  const result = await pool.query(
    `SELECT t.* FROM dk_tokens t
     INNER JOIN dk_wallets w ON t.creator_wallet = w.address
     WHERE w.user_id = $1
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

export { pool };
