/**
 * Client-safe wallet utilities
 * These functions can be used in both client and server components
 */

/**
 * Format wallet address for display
 * e.g., "7xQ3...4fKm"
 */
export function getWalletDisplayName(walletAddress: string): string {
  if (!walletAddress || walletAddress.length < 8) return walletAddress;
  return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
}

/**
 * Get Pump.fun profile URL for a wallet
 */
export function getPumpFunProfileUrl(walletAddress: string): string {
  return `https://pump.fun/profile/${walletAddress}`;
}

/**
 * Check if a string looks like a Solana wallet address
 * (Base58, 32-44 characters)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) return false;
  // Base58 characters (no 0, O, I, l)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}
