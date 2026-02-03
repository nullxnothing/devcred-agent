/**
 * Unified rate limiter for Helius API
 * Single source of truth - prevents rate limit drift between modules
 */

import { API_LIMITS } from '../constants';

const requestTimestamps: number[] = [];
const MAX_REQUESTS_PER_SECOND = API_LIMITS.HELIUS_RPS;

/**
 * Sleep utility
 */
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Rate limited fetch - enforces Helius RPS limit across all modules
 */
export async function rateLimitedFetch(url: string, options: RequestInit): Promise<Response> {
  const now = Date.now();
  const oneSecondAgo = now - 1000;

  // Clean old timestamps
  while (requestTimestamps.length > 0 && requestTimestamps[0] < oneSecondAgo) {
    requestTimestamps.shift();
  }

  // Wait if at rate limit
  if (requestTimestamps.length >= MAX_REQUESTS_PER_SECOND) {
    const waitTime = requestTimestamps[0] + 1000 - now;
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  requestTimestamps.push(Date.now());
  return fetch(url, options);
}

/**
 * Rate limited fetch with retry logic for transient failures
 * Handles 429 (rate limit) and 503 (service unavailable) with exponential backoff
 */
export async function rateLimitedFetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await rateLimitedFetch(url, options);

    if (response.ok) {
      return response;
    }

    // Retry on rate limit or server errors
    if (response.status === 429 || response.status === 503) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await sleep(backoffMs);
      lastError = new Error(`Helius API error: ${response.status} ${response.statusText}`);
      continue;
    }

    // Non-retryable error
    throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Get current rate limiter stats (for debugging)
 */
export function getRateLimiterStats(): {
  currentRequests: number;
  maxPerSecond: number;
  utilizationPercent: number;
} {
  const now = Date.now();
  const oneSecondAgo = now - 1000;

  const currentRequests = requestTimestamps.filter(ts => ts > oneSecondAgo).length;

  return {
    currentRequests,
    maxPerSecond: MAX_REQUESTS_PER_SECOND,
    utilizationPercent: Math.round((currentRequests / MAX_REQUESTS_PER_SECOND) * 100),
  };
}
