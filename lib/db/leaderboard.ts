import { pool } from './pool';
import { User } from '@/types/database';

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

export async function updateUserRank(userId: string): Promise<number | null> {
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
