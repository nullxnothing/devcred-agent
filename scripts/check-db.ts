import 'dotenv/config';
import { Pool } from 'pg';

// Use Railway PostgreSQL directly
const RAILWAY_DB_URL = 'postgresql://postgres:NajctWeCLYaSywSNHKxkWElcSbTsDSPc@caboose.proxy.rlwy.net:58182/railway';

const pool = new Pool({ 
  connectionString: RAILWAY_DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const wallet = 'G6k9a2JjrFpyJC7aWhGc4b3Zfr7JKFQmtAtbjs7hsbFK';
  
  // Get wallet and user info
  const walletRes = await pool.query('SELECT * FROM dk_wallets WHERE address = $1', [wallet]);
  if (!walletRes.rows[0]) {
    console.log('Wallet not found');
    await pool.end();
    return;
  }
  
  const userId = walletRes.rows[0].user_id;
  console.log('User ID:', userId);
  
  // Check tokens
  const tokenRes = await pool.query('SELECT * FROM dk_tokens WHERE user_id = $1', [userId]);
  console.log('Tokens in DB:', tokenRes.rows.length);
  tokenRes.rows.forEach(t => console.log('  -', t.name, t.symbol, '| Score:', t.score));
  
  // Get user score
  const userRes = await pool.query('SELECT total_score, rank FROM dk_users WHERE id = $1', [userId]);
  console.log('User score:', userRes.rows[0]?.total_score, '| Rank:', userRes.rows[0]?.rank);
  
  await pool.end();
}

check();
