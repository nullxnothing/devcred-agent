import { pool } from './pool';
import { Wallet, NewWallet } from '@/types/database';

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
  await pool.query(
    'UPDATE dk_wallets SET is_primary = FALSE WHERE user_id = $1',
    [userId]
  );
  const result = await pool.query(
    'UPDATE dk_wallets SET is_primary = TRUE WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return (result.rowCount ?? 0) > 0;
}
