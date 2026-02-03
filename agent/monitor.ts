/**
 * PumpPortal WebSocket Monitor
 *
 * Connects to pump.fun's real-time feed and queues new token deployers for scanning.
 */

import WebSocket from 'ws';
import { PumpPortalTokenEvent, QueuedWallet } from './types';
import { walletQueue } from './queue';

const PUMPPORTAL_WS_URL = 'wss://pumpportal.fun/api/data';
const RECONNECT_DELAY_MS = 5000;
const HEARTBEAT_INTERVAL_MS = 30000;

class PumpPortalMonitor {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private tokenCount = 0;
  private startTime: Date | null = null;

  /**
   * Start monitoring pump.fun for new token launches
   */
  start(): void {
    if (this.isRunning) {
      console.log('[Monitor] Already running');
      return;
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.connect();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    console.log('[Monitor] Stopped');
  }

  private connect(): void {
    if (!this.isRunning) return;

    console.log('[Monitor] Connecting to PumpPortal...');

    try {
      this.ws = new WebSocket(PUMPPORTAL_WS_URL);

      this.ws.on('open', () => {
        console.log('[Monitor] Connected to PumpPortal');
        this.subscribe();
        this.startHeartbeat();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('[Monitor] Connection closed');
        this.scheduleReconnect();
      });

      this.ws.on('error', (error: Error) => {
        console.error('[Monitor] WebSocket error:', error.message);
      });
    } catch (error) {
      console.error('[Monitor] Failed to connect:', error);
      this.scheduleReconnect();
    }
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to new token creation events
    const payload = {
      method: 'subscribeNewToken',
    };

    this.ws.send(JSON.stringify(payload));
    console.log('[Monitor] Subscribed to new token events');
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private handleMessage(data: Buffer): void {
    try {
      const event = JSON.parse(data.toString()) as PumpPortalTokenEvent;

      // Only process token creation events
      if (event.txType !== 'create') return;
      if (!event.traderPublicKey || !event.mint) return;

      this.tokenCount++;

      const queuedWallet: QueuedWallet = {
        address: event.traderPublicKey,
        tokenMint: event.mint,
        tokenName: event.name,
        tokenSymbol: event.symbol,
        queuedAt: new Date(),
        priority: 1, // Normal priority for new launches
      };

      const wasQueued = walletQueue.enqueue(queuedWallet);

      if (wasQueued) {
        console.log(
          `[Monitor] Queued deployer ${event.traderPublicKey.slice(0, 8)}... ` +
          `for token ${event.symbol || event.mint.slice(0, 8)}`
        );
      }
    } catch (error) {
      // Ignore parse errors for non-JSON messages
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning) return;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    console.log(`[Monitor] Reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, RECONNECT_DELAY_MS);
  }

  /**
   * Get monitor stats
   */
  getStats(): {
    isRunning: boolean;
    tokenCount: number;
    uptime: number;
    connected: boolean;
  } {
    return {
      isRunning: this.isRunning,
      tokenCount: this.tokenCount,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      connected: this.ws?.readyState === WebSocket.OPEN,
    };
  }
}

// Singleton instance
export const pumpMonitor = new PumpPortalMonitor();
