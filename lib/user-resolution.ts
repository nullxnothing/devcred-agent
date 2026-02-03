import { PublicKey } from '@solana/web3.js';
import { getUserByTwitterHandle, getOrCreateSystemUser } from './db';
import { isValidSolanaAddress, cleanTwitterHandle } from './profile-service';
import { User } from '@/types/database';

/**
 * Resolve user from Twitter handle or wallet address
 */
export async function resolveUserFromHandle(handle: string): Promise<User | null> {
  const cleanHandle = cleanTwitterHandle(handle);

  // Try Twitter handle first
  let user = await getUserByTwitterHandle(cleanHandle);
  if (user) return user;

  // Check if it's a valid Solana address
  try {
    new PublicKey(cleanHandle);
    if (isValidSolanaAddress(cleanHandle)) {
      return await getOrCreateSystemUser(cleanHandle);
    }
  } catch {
    // Not a valid address
  }

  return null;
}
