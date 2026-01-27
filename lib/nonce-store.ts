/**
 * Shared nonce store for wallet verification
 * In production, replace with Redis or database storage
 */

interface NonceData {
  nonce: string;
  userId: string;
  expiresAt: number;
}

// In-memory store
const store = new Map<string, NonceData>();

const NONCE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function setNonce(walletAddress: string, userId: string, nonce: string): void {
  store.set(walletAddress, {
    nonce,
    userId,
    expiresAt: Date.now() + NONCE_EXPIRY_MS,
  });
}

export function getNonce(walletAddress: string): NonceData | undefined {
  return store.get(walletAddress);
}

export function deleteNonce(walletAddress: string): void {
  store.delete(walletAddress);
}

export function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (value.expiresAt < now) {
      store.delete(key);
    }
  }
}

export function createSignMessage(walletAddress: string, nonce: string): string {
  return `DevKarma Wallet Verification

Sign this message to verify you own this wallet.

Wallet: ${walletAddress}
Nonce: ${nonce}

This signature will not cost any SOL and does not authorize any transactions.`;
}
