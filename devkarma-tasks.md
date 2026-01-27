# DevKarma Implementation Tasks

- [ ] **Project Initialization**
  - [ ] Initialize Next.js 14 app (`npx create-next-app@latest`) with TypeScript, Tailwind, ESLint
  - [ ] Install dependencies: `@supabase/supabase-js`, `@solana/web3.js`, `@solana/wallet-adapter-react`, `next-auth`, `lucide-react`, `clsx`, `tailwind-merge`
  - [ ] Configure Tailwind with Design System (Cream/Forest theme, Fonts)
  - [ ] Set up project structure (`/components`, `/lib`, `/types`, `/app/api`)

- [x] **Database Setup (Railway PostgreSQL)**
  - [x] Create `dk_users` table (Twitter auth data)
  - [x] Create `dk_wallets` table (Verified addresses)
  - [x] Create `dk_tokens` table (Launch history & stats)
  - [x] Create `dk_score_history` & `dk_profile_views` tables
  - [x] Database client (`lib/db.ts`) with all CRUD operations

- [x] **Core Integrations (Lib Layer)**
  - [x] Implement Helius Client (`lib/helius.ts`)
    - [x] `getTokensCreatedByWallet`
    - [x] `getTokenHolders`
    - [x] `getWalletTransactions`
  - [x] Implement DexScreener Client (`lib/dexscreener.ts`)
    - [x] `getTokenMarketData`
    - [x] `checkMigrationStatus`
  - [x] Implement Scoring Engine (`lib/scoring.ts`)
    - [x] `calculateTokenScore` (Migration, ATH, etc.)
    - [x] `calculateDevScore` (Weighted avg, Tier logic)

- [x] **Authentication & Wallet Verification**
  - [x] Configure NextAuth.js with Twitter Provider (`lib/auth.ts`)
  - [x] Implement Wallet Verification API
    - [x] Generate unique nonce message (`app/api/wallet/nonce/route.ts`)
    - [x] Verify signature using `nacl` (`app/api/wallet/verify/route.ts`)
  - [x] Build Frontend Wallet Connect Component (`components/wallet/WalletConnect.tsx`)

- [x] **Backend API Development**
  - [x] `/api/profile/[handle]` - Fetch profile & calc scores
  - [x] `/api/search` - Look up wallets/tokens
  - [x] `/api/leaderboard` - Aggregate top scores
  - [x] `/api/user/sync` - Trigger data refresh for user

- [x] **Frontend Development (Public)** - Wired to Backend
  - [x] **Landing Page**: Hero, Value Prop, Search Bar (uses /api/leaderboard)
  - [x] **Profile Page**: (uses /api/profile/[handle])
    - [x] Dev Score Card (with visual breakdown)
    - [x] Token History Table (sortable)
    - [x] "Proven/Rugged" Status indicators
  - [x] **Leaderboard**: Top ranking devs list (uses /api/leaderboard)
  - [x] **Search**: Result handling for wallets (uses /api/search)

- [ ] **Frontend Development (Authenticated)**
  - [ ] **Dashboard**: User overview
  - [ ] **Wallet Settings**: Link/Unlink wallets
  - [ ] **Profile Settings**: Edit bio, refresh data

- [ ] **Polish & Launch**
  - [ ] OG Image generation for shareable profiles
  - [ ] End-to-end testing of verification flow
  - [ ] Verify rate limit handling
