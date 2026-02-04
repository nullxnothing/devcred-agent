/**
 * DevCred Agent Entry Point
 *
 * Run with: npx tsx agent/run.ts
 *
 * Environment variables:
 *   DATABASE_URL      - PostgreSQL connection string
 *   HELIUS_API_KEY    - Helius API key for Solana data
 *   FORUM_API_KEY     - (optional) Colosseum forum API key
 */

import { pumpMonitor } from './monitor';
import { walletQueue } from './queue';
import { processWallet, getProcessorStats } from './processor';
import { forumClient } from './forum';
import { startServer } from './server';

const STATS_INTERVAL_MS = 60 * 1000; // Log stats every minute

async function main() {
  console.log('='.repeat(50));
  console.log('DevCred Agent - Pump.fun Monitor');
  console.log('='.repeat(50));

  // Check required env vars
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL not set');
    process.exit(1);
  }

  if (!process.env.HELIUS_API_KEY) {
    console.error('ERROR: HELIUS_API_KEY not set');
    process.exit(1);
  }

  // Configure forum client if API key provided
  if (process.env.FORUM_API_KEY) {
    forumClient.setApiKey(process.env.FORUM_API_KEY);
  } else {
    console.log('[Agent] No FORUM_API_KEY set, forum posting disabled');
  }

  // Set up queue processor
  walletQueue.onProcess(processWallet);

  // Start HTTP server for API
  console.log('[Agent] Starting HTTP server...');
  startServer();

  // Start components
  console.log('[Agent] Starting pump.fun monitor...');
  pumpMonitor.start();

  console.log('[Agent] Starting wallet queue processor...');
  walletQueue.startProcessing();

  // Log stats periodically
  setInterval(() => {
    const monitorStats = pumpMonitor.getStats();
    const queueStats = walletQueue.getStats();
    const processorStats = getProcessorStats();
    const forumStats = forumClient.getStats();

    console.log('\n--- Agent Stats ---');
    console.log(`Uptime: ${Math.floor(monitorStats.uptime / 1000 / 60)}m`);
    console.log(`Connected: ${monitorStats.connected}`);
    console.log(`Tokens seen: ${monitorStats.tokenCount}`);
    console.log(`Queue size: ${queueStats.queueSize}`);
    console.log(`Wallets processed: ${processorStats.processed}`);
    console.log(`Errors: ${processorStats.errors}`);
    console.log(`Alerts posted: ${processorStats.alertsPosted}`);
    console.log(`Forum enabled: ${forumStats.hasApiKey}`);
    console.log('-------------------\n');
  }, STATS_INTERVAL_MS);

  // Handle shutdown
  const shutdown = () => {
    console.log('\n[Agent] Shutting down...');
    pumpMonitor.stop();
    walletQueue.stopProcessing();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[Agent] Running. Press Ctrl+C to stop.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
