/**
 * Generic Rate Limiter for API calls
 * Consolidates rate limiting logic used across helius.ts and dexscreener.ts
 */

export class RateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerWindow: number;
  private readonly windowMs: number;

  constructor(maxPerWindow: number, windowMs: number = 60000) {
    this.maxPerWindow = maxPerWindow;
    this.windowMs = windowMs;
  }

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    await this.waitForSlot();
    this.timestamps.push(Date.now());
    return fetch(url, options);
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Remove timestamps outside the window
    this.timestamps = this.timestamps.filter(t => t > windowStart);

    if (this.timestamps.length >= this.maxPerWindow) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = oldestInWindow + this.windowMs - now;
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /** Get current usage count within window */
  getUsage(): number {
    const windowStart = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter(t => t > windowStart);
    return this.timestamps.length;
  }
}

// Pre-configured rate limiters for common APIs
export const heliusRateLimiter = new RateLimiter(10, 1000); // 10 RPS
export const dexScreenerRateLimiter = new RateLimiter(300, 60000); // 300/min
export const geckoTerminalRateLimiter = new RateLimiter(30, 60000); // 30/min
