import { pool } from './pool';
import { ScoreHistory } from '@/types/database';

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
