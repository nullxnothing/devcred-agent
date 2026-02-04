# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevCred is a **developer reputation platform for Solana token creators**. It calculates a "credit score" (0-740) for crypto devs based on their on-chain launch history, distinguishing between "fizzled" tokens (low traction) and "rugged" tokens (dev dumped on holders).

**This project is entered in the Colosseum Agent Hackathon ($100k prize pool, ends Feb 12, 2026).**

## Colosseum Hackathon

| Item | Value |
|------|-------|
| Agent ID | 279 |
| Agent Name | devcred-agent |
| Project ID | 147 |
| Project Status | draft |
| Claim Status | ✅ Claimed by @devcredfun |
| Deadline | Feb 12, 2026 12:00 PM EST |

### API Key (stored in Railway)
```
FORUM_API_KEY=fccbc70b53f1b9fb8a6a87164b1ea1f6b17a10bd4b71f19d179c1ff40d8f782a
```

### Colosseum API
- Base URL: `https://agents.colosseum.com/api`
- Skill file: `https://colosseum.com/skill.md`
- Heartbeat: `https://colosseum.com/heartbeat.md`

### Submit Project (when ready)
```bash
curl -X POST https://agents.colosseum.com/api/my-project/submit \
  -H "Authorization: Bearer $FORUM_API_KEY"
```

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm run agent    # Run pump.fun monitoring agent
```

## Tech Stack

- **Next.js 16** (App Router) with React 19 and TypeScript
- **Tailwind CSS v4** (uses `@tailwindcss/postcss`)
- **PostgreSQL** via Railway with raw `pg` driver (no ORM)
- **Wallet-first auth** with Solana wallet signature (tweetnacl/Ed25519)
- **Twitter OAuth 2.0** (optional) - users can link Twitter to their account
- **Helius API** for Solana blockchain data (DAS API)
- **DexScreener/GeckoTerminal** for market data

## Architecture

### Data Flow
```
Wallet signature (tweetnacl) → dk_users created with wallet as primary identity
     ↓
Helius DAS API scans wallet → dk_tokens discovered
     ↓
DexScreener checks migration → Scoring engine (0-150 per token)
     ↓
Weighted average → Dev score (0-740) with tier assignment
     ↓
(Optional) Link Twitter account → Updates dk_users with twitter_handle
```

### Deployment Architecture
```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│      Vercel (Frontend)          │     │      Railway (Agent)            │
│  - Next.js App Router           │     │  - Standalone Node.js server    │
│  - Public pages & dashboard     │     │  - pump.fun WebSocket monitor   │
│  - API routes (/api/*)          │     │  - /api/reputation/:wallet      │
│  - Wallet auth flow             │     │  - Pre-computes scores          │
│  URL: devkarma.fun              │     │  URL: devkarmaagent-production  │
└─────────────┬───────────────────┘     └─────────────┬───────────────────┘
              │                                       │
              └───────────────┬───────────────────────┘
                              ▼
              ┌─────────────────────────────────┐
              │    Railway PostgreSQL           │
              │  - dk_users, dk_wallets         │
              │  - dk_tokens, dk_score_history  │
              │  - Shared by both services      │
              └─────────────────────────────────┘
```

### Core Modules (`lib/`)

| File | Purpose |
|------|---------|
| `db.ts` | PostgreSQL CRUD with raw SQL queries |
| `wallet-auth.ts` | Wallet-first authentication (JWT sessions) |
| `auth.ts` | NextAuth config for optional Twitter linking |
| `helius/` | Solana data: token creator detection, rug detection, holder counts |
| `dexscreener.ts` | Market data + migration detection (Raydium/Orca/Meteora) |
| `scoring.ts` | Token scoring (0-100) and dev scoring (0-740) with tiers |
| `data-fetching.ts` | Unified profile/leaderboard data retrieval |

### Route Groups

- `app/(public)/` - Public pages (landing, profiles, leaderboard)
- `app/api/` - API routes (auth, wallet, profile, token, leaderboard, reputation)

### Database Tables

All prefixed with `dk_`:
- `dk_users` - User accounts (wallet-based), optional twitter_handle, pumpfun_username, total_score, tier
- `dk_wallets` - Verified wallet addresses linked to users
- `dk_tokens` - Token launch history with scores and metadata
- `dk_score_history` - Score snapshots over time

## Key Patterns

### Import Paths
Use `@/*` alias: `import { Button } from '@/components/ui/Button'`

### Authentication Flow (Wallet-First)
1. User connects Solana wallet (Phantom/Solflare)
2. Request nonce: `POST /api/auth/wallet/nonce`
3. User signs message with wallet
4. Verify Ed25519 signature: `POST /api/auth/wallet/verify`
5. JWT session created, stored in `dk_session` cookie
6. User account created in `dk_users` with wallet as primary identity
7. (Optional) User can link Twitter via NextAuth OAuth

### Optional Twitter Linking
Users can optionally add their Twitter handle to their profile after wallet authentication.
This uses NextAuth.js with Twitter OAuth 2.0 but is not required for account creation.

### System Users
Wallet addresses without linked users auto-create unverified profiles via `getOrCreateSystemUser()` with generated handles (`dev_XXXXXXXX`).

### Pump.fun Integration
- Profile pages link directly to pump.fun profiles (`pump.fun/profile/{walletAddress}`)
- Users can set their pump.fun display name (`pumpfun_username` column)
- Agent monitors pump.fun launches via PumpPortal WebSocket

### API Rate Limiting
- Helius: 50 RPS (dev plan) - sliding window with jitter backoff, 30s request timeout
- Helius tx cache: 5-minute TTL, max 500 entries (LRU eviction)
- DexScreener: 5-minute cache on market data

### Scoring Quick Reference
- **Token scores**: 0-100 (migration, traction, holders, dev behavior, longevity)
- **Dev scores**: 0-740 (weighted average + bonuses - penalties)
- **Tiers**: Legend (700+), Elite (600+), Rising Star (500+), Proven (450+), Builder (300+), Verified (150+), Penalized, Unverified

> **📚 Detailed Documentation**: See `.claude/` folder for comprehensive docs:
> - `.claude/scoring-system.md` - Full scoring breakdown
> - `.claude/badge-system.md` - Achievement badges
> - `.claude/api-reference.md` - Complete API documentation
> - `.claude/architecture.md` - System architecture & database schema

## Agent Service (`agent/`)

The agent monitors pump.fun token launches in real-time and builds a pre-computed reputation database.
Runs as a **separate Node.js HTTP server on Railway** (not part of Next.js).

### Architecture
```
PumpPortal WebSocket → Queue → Wallet Scanner → PostgreSQL
                                    ↓
                          Notable Event Detection → Colosseum Forum
```

### Agent Files
| File | Purpose |
|------|---------|
| `run.ts` | Entry point (`npm run agent`) |
| `server.ts` | HTTP server for `/api/reputation/:wallet` |
| `monitor.ts` | PumpPortal WebSocket connection |
| `queue.ts` | In-memory wallet processing queue |
| `processor.ts` | Scans wallets via existing `scanWalletQuick()` |
| `alerts.ts` | Detects notable events (3+ rugs, elite devs) |
| `forum.ts` | Posts alerts to Colosseum forum |

### API Endpoint (Railway Agent)
```
GET https://devkarmaagent-production.up.railway.app/api/reputation/{wallet}
```
Returns pre-computed score or triggers fresh scan. Used by Chrome extension.

### API Endpoint (Vercel Next.js)
```
GET https://devkarma.fun/api/reputation/{wallet}
```
Same functionality, runs in Next.js API route. Used by web app.

## Deployment

### Vercel (Frontend + Next.js API)
- URL: https://devkarma.fun
- Auto-deploys from main branch
- Environment variables set in Vercel dashboard

### Railway (Agent Service)
- Project: `devkarmaagent`
- Service: `devkarmaagent`
- URL: https://devkarmaagent-production.up.railway.app
- Dashboard: https://railway.com/project/b472c977-6bdb-457e-af6c-41f307406e0b

### Railway CLI Commands
```bash
railway status              # Check project/service status
railway logs --lines 50     # View recent logs
railway variables --set "KEY=value"  # Set env var
railway up --detach         # Deploy
```

### GitHub
- Repo: https://github.com/kaelxsol/devcred-agent

## Chrome Extension (`extension/`)

Browser extension that injects DevCred reputation badges into Axiom.trade.

### Installation
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/` folder
4. Navigate to axiom.trade

### Files
| File | Purpose |
|------|---------|
| `manifest.json` | Extension config, permissions, content script matching |
| `content.js` | Injects badges into Axiom pages |
| `styles.css` | Badge styling (traffic light colors) |
| `popup.html` | Toggle UI when clicking extension icon |
| `popup.js` | Popup logic, settings, API status check |

### How It Works
```
Axiom Page Load
     ↓
Content script finds x.com/search links (contain full wallet address)
     ↓
Extracts wallet from ?q= parameter
     ↓
Calls GET /api/reputation/{wallet} on Railway agent
     ↓
Injects badge with score/color next to:
  - Token names (Pulse page)
  - DA: address (Token detail page)
```

### Badge Colors
| Color | Tier | Score |
|-------|------|-------|
| 🟢 Green | Elite/Legend | 600+ |
| 🟡 Yellow | Proven/Builder | 300-599 |
| 🟠 Orange | Verified | 150-299 |
| 🔴 Red | Penalized | <150 |
| ⚫ Gray | New/Unknown | 0 |

### Key Implementation Details
- Wallet addresses extracted from Twitter search links (`x.com/search?q={wallet}`)
- 5-minute client-side cache to reduce API calls
- MutationObserver watches for dynamic content changes
- Scores parsed as floats (API returns strings like "55.00")
- Points to Railway agent: `https://devkarmaagent-production.up.railway.app`

### Debugging
Open DevTools console on Axiom, look for `[DevCred]` messages:
- `Twitter links found: X` - How many wallet links detected
- `Found wallet: ...` - Extracted wallet address
- `DA badge injected!` - Successfully added badge

## Environment Variables

### Required (Both Services)
- `DATABASE_URL` - Railway PostgreSQL connection string
- `HELIUS_API_KEY` - Solana blockchain data

### Required (Vercel/Next.js)
- `JWT_SECRET` or `NEXTAUTH_SECRET` - For wallet session JWT signing
- `NEXTAUTH_URL` - Base URL for auth callbacks

### Optional (Twitter Linking)
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` - OAuth 2.0 (only if enabling Twitter link feature)

### Required (Railway Agent)
- `FORUM_API_KEY` - Colosseum hackathon API key
