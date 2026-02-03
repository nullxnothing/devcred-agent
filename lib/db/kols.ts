import { pool } from './pool';
import { Kol, NewKol } from '@/types/database';

export interface KolWithUser extends Kol {
  user_total_score: number | null;
  user_twitter_handle: string | null;
  user_twitter_name: string | null;
  user_avatar_url: string | null;
  user_rank: number | null;
  user_tier: string | null;
  user_is_verified: boolean | null;
}

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
