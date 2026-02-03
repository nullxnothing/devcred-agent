/**
 * Database-backed nonce store for wallet verification
 * Works across multiple server instances (unlike in-memory storage)
 */

import { pool } from './db';

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface NonceData {
  nonce: string;
  userId: string;
  expiresAt: number;
}

/**
 * Store a nonce in the database (requires userId - for adding secondary wallets)
 */
export async function setNonce(walletAddress: string, userId: string, nonce: string): Promise<void> {
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

  await pool.query(
    `INSERT INTO dk_wallet_nonces (wallet_address, user_id, nonce, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (wallet_address) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       nonce = EXCLUDED.nonce,
       expires_at = EXCLUDED.expires_at`,
    [walletAddress, userId, nonce, expiresAt]
  );
}

/**
 * Store a nonce for public wallet authentication (no userId required)
 * Used for initial login/signup with wallet
 */
export async function setNoncePublic(walletAddress: string, nonce: string): Promise<void> {
  const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS);

  await pool.query(
    `INSERT INTO dk_wallet_nonces (wallet_address, user_id, nonce, expires_at)
     VALUES ($1, NULL, $2, $3)
     ON CONFLICT (wallet_address) DO UPDATE SET
       user_id = NULL,
       nonce = EXCLUDED.nonce,
       expires_at = EXCLUDED.expires_at`,
    [walletAddress, nonce, expiresAt]
  );
}

/**
 * Get a nonce from the database
 */
export async function getNonce(walletAddress: string): Promise<NonceData | undefined> {
  const result = await pool.query(
    `SELECT nonce, user_id, expires_at FROM dk_wallet_nonces WHERE wallet_address = $1`,
    [walletAddress]
  );

  if (result.rows.length === 0) {
    return undefined;
  }

  const row = result.rows[0];
  return {
    nonce: row.nonce,
    userId: row.user_id,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

/**
 * Delete a nonce from the database
 */
export async function deleteNonce(walletAddress: string): Promise<void> {
  await pool.query(
    `DELETE FROM dk_wallet_nonces WHERE wallet_address = $1`,
    [walletAddress]
  );
}

/**
 * Cleanup expired nonces (call periodically or via cron)
 */
export async function cleanupExpiredNonces(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM dk_wallet_nonces WHERE expires_at < NOW()`
  );
  return result.rowCount ?? 0;
}

/**
 * Create the sign message for wallet verification
 */
export function createSignMessage(walletAddress: string, nonce: string): string {
  return `DevCred Wallet Verification

Sign this message to verify you own this wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}

This signature will not cost any SOL and does not authorize any transactions.`;
}
