import { pool } from './pool';

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
