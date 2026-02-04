# Architecture

## System Overview

DevCred is deployed as two separate services that share a common database.

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

---

## Data Flow

### Authentication Flow
```
User connects Solana wallet (Phantom/Solflare)
     ↓
POST /api/auth/wallet/nonce → Get nonce
     ↓
User signs message with wallet
     ↓
POST /api/auth/wallet/verify → Verify signature (tweetnacl)
     ↓
JWT session created, stored in dk_session cookie
     ↓
User account created in dk_users with wallet as primary identity
     ↓
(Optional) Link Twitter via NextAuth OAuth
```

### Token Scanning Flow
```
Wallet authenticated
     ↓
Helius DAS API (getAssetsByCreator) → Discover tokens
     ↓
For each token:
  ├── DexScreener API → Get market data, ATH
  ├── Helius → Get holder count
  └── Check migration status (Raydium/Orca/Meteora)
     ↓
Calculate token scores (0-100 each)
     ↓
Calculate dev score (0-740) with weighted average
     ↓
Assign tier based on score + criteria
     ↓
Store in dk_tokens, update dk_users.total_score
```

### Agent Monitoring Flow
```
PumpPortal WebSocket (pump.fun new launches)
     ↓
Extract creator wallet address
     ↓
Queue wallet for processing
     ↓
scanWalletQuick() → Get full token history
     ↓
Store/update in PostgreSQL
     ↓
Check for notable events:
  ├── 3+ rugs → Alert
  └── Elite tier dev → Alert
     ↓
Post to Colosseum forum
```

---

## Directory Structure

```
devkarma/
├── .claude/                 # Claude documentation
├── agent/                   # Railway agent service
│   ├── run.ts              # Entry point
│   ├── server.ts           # HTTP server
│   ├── monitor.ts          # WebSocket connection
│   ├── queue.ts            # Processing queue
│   ├── processor.ts        # Wallet scanner
│   ├── alerts.ts           # Event detection
│   └── forum.ts            # Colosseum posts
├── app/                     # Next.js App Router
│   ├── (public)/           # Public pages
│   │   ├── page.tsx        # Landing page
│   │   ├── login/          # Login page
│   │   ├── profile/[handle]/ # Profile pages
│   │   └── leaderboard/    # Leaderboard
│   ├── (authenticated)/    # Protected pages
│   └── api/                # API routes
│       ├── auth/           # Authentication
│       ├── profile/        # Profile endpoints
│       ├── reputation/     # Reputation lookup
│       ├── leaderboard/    # Leaderboard
│       └── ...
├── components/              # React components
│   ├── ui/                 # Base UI components
│   ├── wallet/             # Wallet connection
│   ├── profile/            # Profile components
│   └── leaderboard/        # Leaderboard components
├── lib/                     # Core business logic
│   ├── db.ts               # PostgreSQL client
│   ├── wallet-auth.ts      # JWT session management
│   ├── auth.ts             # NextAuth (Twitter)
│   ├── scoring.ts          # Scoring engine
│   ├── badges.ts           # Badge calculations
│   ├── helius/             # Helius API modules
│   ├── dexscreener.ts      # Market data
│   └── ...
├── extension/               # Chrome extension
└── types/                   # TypeScript types
```

---

## Database Schema

### dk_users
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| twitter_id | VARCHAR | Twitter ID (optional) |
| twitter_handle | VARCHAR | Twitter handle (optional) |
| twitter_name | VARCHAR | Display name |
| avatar_url | TEXT | Profile image |
| pumpfun_username | VARCHAR | pump.fun display name |
| primary_wallet | VARCHAR | Primary wallet address |
| total_score | INTEGER | Dev score (0-740) |
| tier | VARCHAR | Current tier |
| rank | INTEGER | Leaderboard rank |
| is_verified | BOOLEAN | Has verified wallet |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

### dk_wallets
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to dk_users |
| address | VARCHAR | Solana address |
| is_primary | BOOLEAN | Primary wallet flag |
| label | VARCHAR | User-defined label |
| verified_at | TIMESTAMP | Verification time |

### dk_tokens
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to dk_users (nullable) |
| mint_address | VARCHAR | Token mint |
| creator_wallet | VARCHAR | Creator address |
| name | VARCHAR | Token name |
| symbol | VARCHAR | Token symbol |
| score | INTEGER | Token score (0-100) |
| migrated | BOOLEAN | DEX migration status |
| migration_type | VARCHAR | Raydium/Orca/etc |
| ath_market_cap | DECIMAL | All-time high mcap |
| holder_count | INTEGER | Current holders |
| dev_holding_percent | DECIMAL | Dev's % holding |
| status | VARCHAR | active/inactive/rug |
| rug_severity | VARCHAR | soft/hard (if rug) |
| launch_date | TIMESTAMP | Token creation |
| created_at | TIMESTAMP | DB record creation |
| updated_at | TIMESTAMP | Last update |

### dk_score_history
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to dk_users |
| score | INTEGER | Score at snapshot |
| tier | VARCHAR | Tier at snapshot |
| created_at | TIMESTAMP | Snapshot time |

---

## External Services

### Helius API
- **Purpose**: Solana blockchain data
- **Endpoints Used**:
  - `getAssetsByCreator` - Find tokens created by wallet
  - `getAssetsByOwner` - Get all wallet assets (SOL, tokens, NFTs) in one call
  - `getTokenAccounts` - Get holder counts
  - `/addresses/{wallet}/transactions` - Transaction history (with `type=SWAP` filter)
- **Rate Limit**: 50 RPS (dev plan)
- **Optimizations**:
  - 30s request timeout (prevents indefinite hangs)
  - Jitter on retry backoff (prevents synchronized retries)
  - 5-minute transaction cache with LRU eviction (max 500 entries)
  - `hasMinimumHolders()` for efficient threshold checks
  - Migration scan limited to 200 transactions with early exit
- **Files**: `lib/helius/`
  - `client.ts` - RPC wrapper with timeout
  - `rate-limiter.ts` - Sliding window + jitter backoff
  - `token-scanner.ts` - Token discovery, `getWalletAssets()`
  - `holder-analysis.ts` - Holder counts, `hasMinimumHolders()`
  - `migration.ts` - DEX swap detection
  - `tx-cache.ts` - Transaction history cache (5min TTL, LRU)
  - `rug-detection.ts` - Rug pattern detection

### DexScreener API
- **Purpose**: Market data, migration detection
- **Endpoints Used**:
  - `/tokens/{addresses}` - Token market data
  - `/pairs/solana/{pair}` - Pair data
- **Rate Limit**: 300/min
- **Cache**: 5-minute TTL
- **Files**: `lib/dexscreener.ts`

### GeckoTerminal API
- **Purpose**: Fallback for DexScreener
- **Rate Limit**: 30/min
- **Files**: `lib/dexscreener.ts`

### PumpPortal WebSocket
- **Purpose**: Real-time pump.fun launches
- **URL**: `wss://pumpportal.fun/api/data`
- **Files**: `agent/monitor.ts`

---

## Chrome Extension

### Architecture
```
extension/
├── manifest.json    # Extension config
├── content.js       # Page injection script
├── styles.css       # Badge styling
├── popup.html       # Extension popup
└── popup.js         # Popup logic
```

### How It Works
1. Content script runs on axiom.trade
2. Finds wallet addresses in x.com/search links
3. Calls Railway agent API for reputation
4. Injects colored badge next to wallet
5. MutationObserver watches for dynamic content

### Badge Injection Points
- Token names (Pulse page)
- DA: address rows (Token detail page)
