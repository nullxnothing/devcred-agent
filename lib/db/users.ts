import { pool } from './pool';
import { User, NewUser } from '@/types/database';
import { createWallet } from './wallets';

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

export async function getUserByWallet(walletAddress: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE primary_wallet = $1',
    [walletAddress]
  );
  return result.rows[0] || null;
}

export async function getUserByPumpFunUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT * FROM dk_users WHERE pumpfun_username = $1',
    [username]
  );
  return result.rows[0] || null;
}

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
      `dev_${walletAddress.slice(0, 8)}`,
      `Dev ${shortAddress}`,
      `https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`,
      walletAddress
    ]
  );

  const user = result.rows[0];

  await createWallet({
    user_id: user.id,
    address: walletAddress,
    label: 'Primary Wallet',
    is_primary: true
  });

  return user;
}

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
