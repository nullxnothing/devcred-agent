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
- **NextAuth.js** with Twitter OAuth 2.0
- **Helius API** for Solana blockchain data (DAS API)
- **DexScreener/GeckoTerminal** for market data

## Architecture

### Data Flow
```
Twitter OAuth → dk_users
     ↓
Wallet signature (tweetnacl) → dk_wallets linked to user
     ↓
Helius DAS API scans wallet → dk_tokens discovered
     ↓
DexScreener checks migration → Scoring engine (0-150 per token)
     ↓
Weighted average → Dev score (0-740) with tier assignment
```

### Core Modules (`lib/`)

| File | Purpose |
|------|---------|
| `db.ts` | PostgreSQL CRUD with raw SQL queries |
| `auth.ts` | NextAuth config for Twitter OAuth |
| `helius.ts` | Solana data: token creator detection, rug detection, holder counts |
| `dexscreener.ts` | Market data + migration detection (Raydium/Orca/Meteora) |
| `scoring.ts` | Token scoring (0-100) and dev scoring (0-740) with tiers |
| `data-fetching.ts` | Unified profile/leaderboard data retrieval |

### Route Groups

- `app/(public)/` - Public pages (landing, profiles, leaderboard)
- `app/api/` - API routes (auth, wallet, profile, token, leaderboard)

### Database Tables

All prefixed with `dk_`:
- `dk_users` - Twitter auth, total_score, rank, tier
- `dk_wallets` - Verified wallet addresses linked to users
- `dk_tokens` - Token launch history with scores and metadata
- `dk_score_history` - Score snapshots over time

## Key Patterns

### Import Paths
Use `@/*` alias: `import { Button } from '@/components/ui/Button'`

### Wallet Verification Flow
1. Request nonce: `POST /api/wallet/nonce`
2. User signs with Phantom/Solflare
3. Verify Ed25519 signature with tweetnacl: `POST /api/wallet/verify`
4. Wallet linked in `dk_wallets`

### System Users
Wallet addresses without linked users auto-create unverified profiles via `getOrCreateSystemUser()` with generated handles (`dev_XXXXXXXX`).

### API Rate Limiting
- Helius: 10 RPS (free tier) - in-memory timestamp tracking
- DexScreener: 5-minute cache on market data

### Scoring Constants (in `lib/scoring.ts`)
- Token score: 0-100 (migration, traction, holders, dev behavior, longevity)
- Dev score: 0-740 (weighted average × 4 + bonuses - penalties)
- Rug penalty: -100 to -150

### Tiers
Legend (700+), Elite (600+), Proven (450+), Builder (300+), Verified (150+), Penalized, Unverified

## Agent Service (`agent/`)

The agent monitors pump.fun token launches in real-time and builds a pre-computed reputation database.

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
| `monitor.ts` | PumpPortal WebSocket connection |
| `queue.ts` | In-memory wallet processing queue |
| `processor.ts` | Scans wallets via existing `scanWalletQuick()` |
| `alerts.ts` | Detects notable events (3+ rugs, elite devs) |
| `forum.ts` | Posts alerts to Colosseum forum |

### API Endpoint
```
GET /api/reputation/{wallet}
```
Returns pre-computed score or triggers fresh scan.

## Deployment

### Railway (Agent)
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

## Environment Variables

Required:
- `DATABASE_URL` - Railway PostgreSQL connection string
- `HELIUS_API_KEY` - Solana blockchain data
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` - OAuth 2.0
- `NEXTAUTH_URL` / `NEXTAUTH_SECRET` - Auth configuration
- `FORUM_API_KEY` - Colosseum hackathon API key (for agent)
