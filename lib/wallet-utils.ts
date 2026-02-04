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

// Note: For address validation, use isValidSolanaAddress from '@/lib/validation/solana'
