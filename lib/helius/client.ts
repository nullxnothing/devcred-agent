/**
 * Helius RPC client
 * Uses unified rate limiter to prevent rate limit drift
 */

import { rateLimitedFetchWithRetry, sleep } from './rate-limiter';

export { sleep };

const REQUEST_TIMEOUT_MS = 30000;

function getHeliusRpcUrl(): string {
  return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
}

export const HELIUS_API_URL = `https://api.helius.xyz/v0`;

export async function heliusRpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await rateLimitedFetchWithRetry(getHeliusRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'devcred',
        method,
        params,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Helius RPC error: ${data.error.message}`);
    }

    return data.result as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function heliusRpcArray<T>(method: string, params: unknown[]): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await rateLimitedFetchWithRetry(getHeliusRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'devcred',
        method,
        params,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`Helius RPC error: ${data.error.message}`);
    }

    return data.result as T;
  } finally {
    clearTimeout(timeout);
  }
}
