/**
 * Simple Solana address validation without Zod dependency
 */

const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Check if a string is a valid Solana address (base58 encoded)
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (address.length < 32 || address.length > 44) {
    return false;
  }

  return SOLANA_ADDRESS_REGEX.test(address);
}
