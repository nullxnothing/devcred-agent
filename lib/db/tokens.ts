import { pool } from './pool';
import { Token, NewToken } from '@/types/database';

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
  const result = await pool.query(
    `SELECT t.* FROM dk_tokens t
     INNER JOIN dk_wallets w ON t.creator_wallet = w.address
     WHERE w.user_id = $1
     ORDER BY t.launch_date DESC`,
    [userId]
  );
  return result.rows;
}
