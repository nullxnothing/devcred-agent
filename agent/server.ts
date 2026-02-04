/**
 * HTTP Server for DevCred Agent
 * Serves the reputation API alongside the WebSocket monitor
 * Supports multi-wallet identity linking
 */

import http from 'http';
import { getUserByAnyWallet, getTokensForUserWallets, getWalletsByUserId, upsertUserByWallet } from '../lib/db';
import { scanWalletQuick } from '../lib/wallet-scan';
import { calculateDevScoreFromAggregate } from '../lib/scoring';

const PORT = process.env.PORT || 3000;
const MAX_BODY_SIZE = 10 * 1024; // 10KB max body size
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per IP

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }

  return false;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const ALLOWED_ORIGINS = [
  'https://devkarma.fun',
  'https://www.devkarma.fun',
  'https://axiom.trade',
  'https://www.axiom.trade',
  'chrome-extension://', // Chrome extensions
];

function isValidSolanaAddress(address: string): boolean {
  return /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(address);
}

function getTierName(tier: string): string {
  const names: Record<string, string> = {
    legend: 'Legend',
    elite: 'Elite',
    rising_star: 'Rising Star',
    proven: 'Proven',
    builder: 'Builder',
    verified: 'Verified',
    penalized: 'Penalized',
    unverified: 'Unverified',
  };
  return names[tier] || 'Unknown';
}

// Handle scraped data update from extension
// Uses Axiom's aggregate data to calculate score WITHOUT API calls
interface UpdateRequestBody {
  tokenCount: number;
  migrationCount: number;
  topMcap?: number;
  rugCount?: number;
  source?: string;
}

async function handleReputationUpdate(wallet: string, body: UpdateRequestBody): Promise<object> {
  if (!isValidSolanaAddress(wallet)) {
    return { error: 'Invalid Solana wallet address', status: 400 };
  }

  const { tokenCount, migrationCount, topMcap, rugCount = 0, source } = body;

  if (typeof tokenCount !== 'number' || typeof migrationCount !== 'number') {
    return { error: 'Missing required fields: tokenCount, migrationCount', status: 400 };
  }

  console.log(`[Server] Received Axiom data for ${wallet}:`, { tokenCount, migrationCount, topMcap, rugCount, source });

  try {
    // Calculate score from aggregate data using the REAL scoring algorithm
    const scoreResult = calculateDevScoreFromAggregate({
      tokenCount,
      migrationCount,
      topMcap: topMcap || 0,
      rugCount,
    });

    console.log(`[Server] Calculated score for ${wallet}:`, {
      score: scoreResult.score,
      tier: scoreResult.tier,
      breakdown: scoreResult.breakdown,
    });

    // Save to database
    await upsertUserByWallet(wallet, {
      total_score: scoreResult.score,
      tier: scoreResult.tier,
      token_count: tokenCount,
      migration_count: migrationCount,
      rug_count: rugCount,
      top_mcap: topMcap || null,
      scraped_at: new Date().toISOString(),
    });

    return {
      success: true,
      wallet,
      score: scoreResult.score,
      tier: scoreResult.tier,
      tierName: getTierName(scoreResult.tier),
      tokenCount,
      migrationCount,
      rugCount,
      breakdown: scoreResult.breakdown,
      source: 'axiom_aggregate',
    };
  } catch (error) {
    console.error('[Server] Score calculation error:', error);
    return { error: 'Failed to calculate score', status: 500 };
  }
}

async function handleReputation(wallet: string): Promise<object> {
  if (!isValidSolanaAddress(wallet)) {
    return { error: 'Invalid Solana wallet address', status: 400 };
  }

  // Two-hop lookup: check primary_wallet, then dk_wallets
  const user = await getUserByAnyWallet(wallet);

  if (user && (user.total_score ?? 0) > 0) {
    // Parallel fetch: tokens and wallets
    const [tokens, wallets] = await Promise.all([
      getTokensForUserWallets(user.id),
      getWalletsByUserId(user.id),
    ]);

    // Use scraped data from dk_users if dk_tokens is empty
    // This happens when extension updates score but full scan hasn't run
    const hasTokenData = tokens.length > 0;
    const tokenCount = hasTokenData ? tokens.length : (user.token_count || 0);
    const rugCount = hasTokenData ? tokens.filter(t => t.status === 'rug').length : (user.rug_count || 0);
    const migrationCount = hasTokenData ? tokens.filter(t => t.migrated).length : (user.migration_count || 0);

    const linkedWallets = wallets.map(w => w.address);
    const isLinkedWallet = user.primary_wallet !== wallet;

    // Only include Twitter info if it's a real Twitter account (has twitter_id)
    // System-generated handles like "dev_XXXXXXXX" should not be returned
    const hasRealTwitter = user.twitter_id && user.twitter_handle && !user.twitter_handle.startsWith('dev_');

    return {
      wallet,
      score: user.total_score,
      tier: user.tier || 'unverified',
      tierName: getTierName(user.tier || 'unverified'),
      tokenCount,
      rugCount,
      migrationCount,
      lastScanned: user.updated_at,
      source: hasTokenData ? 'cached' : 'scraped',
      userId: user.id,
      linkedWallets: linkedWallets.length > 1 ? linkedWallets : undefined,
      isLinkedWallet: isLinkedWallet || undefined,
      // Only include Twitter info if user has linked a real Twitter account
      twitterHandle: hasRealTwitter ? user.twitter_handle : undefined,
      twitterName: hasRealTwitter ? user.twitter_name : undefined,
      avatarUrl: hasRealTwitter ? user.avatar_url : undefined,
    };
  }

  // No cached data, perform fresh scan
  const result = await scanWalletQuick(wallet);

  return {
    wallet,
    score: result.totalScore,
    tier: result.tier,
    tierName: result.tierName,
    tokenCount: result.breakdown.tokenCount,
    rugCount: result.breakdown.rugCount,
    migrationCount: result.breakdown.migrationCount,
    lastScanned: new Date().toISOString(),
    source: 'fresh',
  };
}

function corsHeaders(origin?: string): Record<string, string> {
  // Check if origin is allowed
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.startsWith(allowed)
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

export function startServer() {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';
    const headers = corsHeaders(origin);

    // Get client IP for rate limiting
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    // Check rate limit (skip for health checks)
    if (!req.url?.includes('/health') && isRateLimited(clientIp)) {
      res.writeHead(429, headers);
      res.end(JSON.stringify({ error: 'Too many requests. Please try again later.' }));
      return;
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, headers);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // Health check
    if (path === '/api/health' || path === '/health') {
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'devcred-agent',
      }));
      return;
    }

    // Reputation update endpoint: POST /api/reputation/:wallet/update
    const updateMatch = path.match(/^\/api\/reputation\/([A-Za-z0-9]+)\/update$/);
    if (updateMatch && req.method === 'POST') {
      const wallet = updateMatch[1];
      try {
        // Read request body with size limit
        let body = '';
        let bodySize = 0;
        for await (const chunk of req) {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) {
            res.writeHead(413, headers);
            res.end(JSON.stringify({ error: 'Request body too large' }));
            return;
          }
          body += chunk;
        }
        const data = JSON.parse(body);

        const result = await handleReputationUpdate(wallet, data);
        if ('status' in result) {
          res.writeHead(result.status as number, headers);
        } else {
          res.writeHead(200, headers);
        }
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('[Server] Update error:', error);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }

    // Reputation endpoint: /api/reputation/:wallet
    const reputationMatch = path.match(/^\/api\/reputation\/([A-Za-z0-9]+)$/);
    if (reputationMatch && req.method === 'GET') {
      const wallet = reputationMatch[1];
      try {
        const result = await handleReputation(wallet);
        if ('status' in result) {
          res.writeHead(result.status as number, headers);
        } else {
          res.writeHead(200, headers);
        }
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('[Server] Reputation error:', error);
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
      return;
    }

    // Root - basic info
    if (path === '/') {
      res.writeHead(200, headers);
      res.end(JSON.stringify({
        service: 'DevCred Agent',
        version: '1.0.0',
        endpoints: [
          'GET /api/health',
          'GET /api/reputation/:wallet',
          'POST /api/reputation/:wallet/update',
        ],
      }));
      return;
    }

    // 404
    res.writeHead(404, headers);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  server.listen(PORT, () => {
    console.log(`[Server] HTTP server listening on port ${PORT}`);
  });

  return server;
}
