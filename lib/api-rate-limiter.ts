/**
 * API Rate Limiter for protecting endpoints against brute force/DoS
 * Uses sliding window algorithm with in-memory store (use Redis in production for multi-instance)
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// Default configs for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Wallet verification - prevent brute force nonce attacks
  walletVerify: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
  walletNonce: { maxRequests: 10, windowMs: 60000 }, // 10 per minute

  // Token operations - prevent spam
  tokenClaim: { maxRequests: 10, windowMs: 60000 }, // 10 per minute

  // User sync - expensive operation (calls Helius API)
  userSync: { maxRequests: 3, windowMs: 60000 }, // 3 per minute

  // General API endpoints
  standard: { maxRequests: 60, windowMs: 60000 }, // 60 per minute
} as const;

/**
 * Check if request should be rate limited
 * @param identifier - Unique identifier (userId, IP, or combination)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(identifier: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(identifier);

  // No existing entry or window expired - allow and start new window
  if (!entry || entry.resetAt < now) {
    store.set(identifier, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Within window - check count
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment and allow
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit identifier from request
 * Uses userId if authenticated, falls back to IP
 */
export function getRateLimitIdentifier(
  endpoint: string,
  userId?: string,
  ip?: string
): string {
  const id = userId || ip || 'anonymous';
  return `${endpoint}:${id}`;
}

/**
 * Create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
}
