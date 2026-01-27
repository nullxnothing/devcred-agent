# DevKarma - AI Coding Instructions

## Project Overview
DevKarma is a **developer reputation platform for Solana token creators**. It calculates a "credit score" (0-740) for crypto devs based on their on-chain launch history, distinguishing between "fizzled" tokens (low traction) and "rugged" tokens (dev dumped on holders).

## Architecture

### Tech Stack
- **Framework**: Next.js 16 with App Router (TypeScript)
- **Database**: Railway PostgreSQL (not Supabase postgres) with `dk_` prefixed tables
- **Auth**: NextAuth.js with Twitter OAuth 2.0
- **Blockchain**: Helius API (Solana DAS API) + DexScreener (market data)
- **Wallet**: `@solana/wallet-adapter-react` for signature verification

### Key Data Flow
```
Twitter OAuth → User created in dk_users
     ↓
Wallet signature verification → dk_wallets linked to user
     ↓
Helius API scans wallet → Tokens discovered in dk_tokens
     ↓
DexScreener checks migration → Scoring engine calculates 0-150 per token
     ↓
Weighted average → Dev score (0-740) with tier assignment
```

### Core Modules (`lib/`)
| File | Purpose |
|------|---------|
| `db.ts` | PostgreSQL client with raw `pg` Pool - all CRUD operations |
| `auth.ts` | NextAuth config - handles Twitter profile structure quirks |
| `helius.ts` | Solana blockchain data via DAS API (getAssetsByCreator, getTokenAccounts) |
| `dexscreener.ts` | Market data + migration detection (Raydium/PumpSwap) |
| `scoring.ts` | Token scoring (0-150) and dev scoring (0-740) with tier logic |
| `nonce-store.ts` | In-memory nonce for wallet signature verification |

## Conventions

### Import Paths
Use `@/*` alias for all imports: `import { Button } from '@/components/ui/Button'`

### Database Tables
All tables are prefixed with `dk_` to avoid conflicts:
- `dk_users` - Twitter auth data, total_score, tier
- `dk_wallets` - Verified wallet addresses linked to users
- `dk_tokens` - Token launch history with scores and metadata
- `dk_score_history` - Score snapshots over time

### API Routes Pattern
Routes in `app/api/` use Next.js route handlers. Profile routes support both Twitter handles and wallet addresses:
```typescript
// app/api/profile/[handle]/route.ts
const user = await getUserByTwitterHandle(handle);
if (!user) {
  // Fallback: check if handle is a valid Solana address
  user = await getOrCreateSystemUser(handle); // Creates unverified profile
}
```

### Scoring Constants
All scoring magic numbers are defined in `lib/scoring.ts` under `SCORE_CONSTANTS`:
- `MAX_TOKEN_SCORE: 150` - Per-token cap
- `MAX_DEV_SCORE: 740` - Overall dev score cap
- `MIGRATION_BONUS: 50` - Points for Raydium/PumpSwap migration
- `RUG_PENALTY: -100` - Penalty for confirmed rugs

### Component Structure
- `components/providers/` - Auth and Wallet context providers (wrap app in `layout.tsx`)
- `components/wallet/WalletConnect.tsx` - Signature verification flow (nonce → sign → verify)
- `components/ui/` - Reusable UI primitives with Tailwind

### Route Groups
- `app/(public)/` - Public pages (landing, profiles, leaderboard)
- `app/(authenticated)/` - Protected pages (dashboard, settings) - *in progress*

## Development Commands
```bash
npm run dev      # Start dev server (default port 3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Environment Variables
See `SETUP_GUIDE.md` for detailed acquisition instructions. Required:
- `DATABASE_URL` - Railway PostgreSQL connection string
- `HELIUS_API_KEY` - Solana blockchain data
- `TWITTER_CLIENT_ID/SECRET` - OAuth 2.0 credentials
- `NEXTAUTH_URL` + `NEXTAUTH_SECRET` - Auth configuration

## Critical Patterns

### Wallet Verification Flow
1. User signs in with Twitter (NextAuth)
2. Frontend requests nonce: `POST /api/wallet/nonce`
3. User signs nonce with Phantom/Solflare
4. Backend verifies signature with `tweetnacl`: `POST /api/wallet/verify`
5. Wallet linked to user in `dk_wallets`

### System Users
When searching for a wallet that doesn't belong to any user, `getOrCreateSystemUser()` creates an unverified profile with generated avatar (dicebear) and handle (`dev_XXXXXXXX`).

### Rate Limiting
- Helius: 10 RPS (free tier) - tracked in `lib/helius.ts`
- DexScreener: 300/min - tracked in `lib/dexscreener.ts`
- Both use in-memory request timestamp arrays for throttling
