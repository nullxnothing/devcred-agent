import { User } from '@/types/database';
import { getUserByWallet, getUserById, createUserFromWallet } from './users';
import { getWalletByAddress } from './wallets';

/**
 * Creates a system-generated user for a wallet that hasn't been claimed yet.
 * @deprecated Use createUserFromWallet for new wallet-first auth
 */
export async function getOrCreateSystemUser(walletAddress: string): Promise<User> {
  const existingUser = await getUserByWallet(walletAddress);
  if (existingUser) return existingUser;

  const existingWallet = await getWalletByAddress(walletAddress);
  if (existingWallet && existingWallet.user_id) {
    const user = await getUserById(existingWallet.user_id);
    if (user) return user;
  }

  return createUserFromWallet(walletAddress);
}
