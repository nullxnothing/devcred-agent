/**
 * Simple in-memory queue for processing deployer wallets
 *
 * Handles deduplication, prioritization, and rate limiting.
 */

import { QueuedWallet } from './types';

const SCAN_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between scans of same wallet
const MAX_QUEUE_SIZE = 1000;

class WalletQueue {
  private queue: QueuedWallet[] = [];
  private recentlyScanned: Map<string, number> = new Map(); // wallet -> timestamp
  private processing = false;
  private processCallback: ((wallet: QueuedWallet) => Promise<unknown>) | null = null;

  /**
   * Add a wallet to the queue for scanning
   */
  enqueue(wallet: QueuedWallet): boolean {
    // Check cooldown
    const lastScanned = this.recentlyScanned.get(wallet.address);
    if (lastScanned && Date.now() - lastScanned < SCAN_COOLDOWN_MS) {
      return false; // Skip, recently scanned
    }

    // Check if already in queue
    if (this.queue.some(w => w.address === wallet.address)) {
      return false; // Already queued
    }

    // Enforce max queue size (drop oldest low-priority items)
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      this.queue.sort((a, b) => b.priority - a.priority);
      this.queue = this.queue.slice(0, MAX_QUEUE_SIZE - 1);
    }

    this.queue.push(wallet);
    this.queue.sort((a, b) => b.priority - a.priority);

    return true;
  }

  /**
   * Get next wallet to process
   */
  dequeue(): QueuedWallet | null {
    return this.queue.shift() || null;
  }

  /**
   * Mark wallet as scanned (for cooldown)
   */
  markScanned(address: string): void {
    this.recentlyScanned.set(address, Date.now());

    // Clean old entries periodically
    if (this.recentlyScanned.size > 10000) {
      const cutoff = Date.now() - SCAN_COOLDOWN_MS;
      const entries = Array.from(this.recentlyScanned.entries());
      for (const [addr, ts] of entries) {
        if (ts < cutoff) {
          this.recentlyScanned.delete(addr);
        }
      }
    }
  }

  /**
   * Check if wallet was recently scanned
   */
  wasRecentlyScanned(address: string): boolean {
    const lastScanned = this.recentlyScanned.get(address);
    return !!lastScanned && Date.now() - lastScanned < SCAN_COOLDOWN_MS;
  }

  /**
   * Set callback for processing wallets
   */
  onProcess(callback: (wallet: QueuedWallet) => Promise<unknown>): void {
    this.processCallback = callback;
  }

  /**
   * Start processing the queue
   */
  async startProcessing(): Promise<void> {
    if (this.processing || !this.processCallback) return;

    this.processing = true;
    console.log('[Queue] Started processing');

    while (this.processing) {
      const wallet = this.dequeue();

      if (!wallet) {
        // Queue empty, wait before checking again
        await sleep(1000);
        continue;
      }

      try {
        await this.processCallback(wallet);
        this.markScanned(wallet.address);
      } catch (error) {
        console.error(`[Queue] Error processing ${wallet.address}:`, error);
        // Don't re-queue on error, just move on
      }

      // Rate limit: wait between scans to respect Helius limits
      await sleep(2000);
    }
  }

  /**
   * Stop processing
   */
  stopProcessing(): void {
    this.processing = false;
    console.log('[Queue] Stopped processing');
  }

  /**
   * Get queue stats
   */
  getStats(): { queueSize: number; recentlyScannedCount: number } {
    return {
      queueSize: this.queue.length,
      recentlyScannedCount: this.recentlyScanned.size,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Singleton instance
export const walletQueue = new WalletQueue();
