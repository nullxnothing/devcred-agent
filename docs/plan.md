# DevKarma — Wallet-First Authentication Migration Plan

## Overview

**Current State**: DevKarma currently uses **Twitter OAuth as the primary authentication method**. Users must first sign in with Twitter, then optionally verify a wallet address as a secondary step. The user identity is centered around `twitter_id` and `twitter_handle`.

**Proposed State**: Switch to a **wallet-first authentication model** (like Pump.fun) where:
1. Users sign in by connecting a wallet and signing a message
2. Users ARE their wallet address (primary identity)
3. Twitter linking becomes optional — a way to enhance their profile with a recognizable handle/avatar
4. Direct linking to Pump.fun profiles via wallet address

**Why This Change**:
- More native to crypto/Solana ecosystem
- No Twitter account required for devs to have reputation
- Wallet IS the identity that creates tokens — makes sense as primary key
- Enables direct linking to Pump.fun creator profiles (`pump.fun/profile/{walletAddress}`)
- Simpler onboarding: connect wallet → done

---

## ✅ IMPLEMENTED

### 1. Database Schema Changes
- [x] Created migration `005_wallet_primary_auth.sql`
- [x] Made `twitter_id` nullable
- [x] Made `twitter_handle` nullable  
- [x] Added `primary_wallet` column
- [x] Created unique index on `primary_wallet`
- [x] Created partial unique indexes for twitter fields

### 2. New Database Functions (lib/db.ts)
- [x] `getUserByWallet(walletAddress)` - Primary lookup by wallet
- [x] `createUserFromWallet(walletAddress)` - Create wallet-based user
- [x] `linkTwitterToUser(userId, twitterId, handle, name, avatar)` - Link Twitter
- [x] `unlinkTwitterFromUser(userId)` - Unlink Twitter
- [x] Updated `createUser()` to support nullable Twitter fields
- [x] Updated `getOrCreateSystemUser()` to use wallet-first approach
- [x] Added `primary_wallet` to allowed update columns

### 3. Auth System (lib/wallet-auth.ts)
- [x] JWT session token creation with `jose`
- [x] Session verification
- [x] Cookie management (set/get/clear)
- [x] `authenticateByWallet()` - Creates user if new
- [x] `getCurrentUser()` - Get user from session
- [x] `getPumpFunProfileUrl()` - Generate Pump.fun link
- [x] `getWalletDisplayName()` - Format wallet for display

### 4. New API Routes
- [x] `POST /api/auth/wallet/nonce` - Public nonce request (no session required)
- [x] `POST /api/auth/wallet/verify` - Verify signature & create session
- [x] `POST /api/auth/wallet/disconnect` - Logout
- [x] `GET /api/auth/me` - Get current user

### 5. Nonce Store Updates (lib/nonce-store.ts)
- [x] Added `setNoncePublic()` for wallet auth (no userId required)
- [x] Existing `setNonce()` preserved for adding secondary wallets

### 6. Type Updates (types/database.ts)
- [x] Made `twitter_id` optional (`string | null`)
- [x] Made `twitter_handle` optional (`string | null`)
- [x] Made `twitter_name` optional (`string | null`)
- [x] Added `primary_wallet: string | null`

### 7. Frontend Components
- [x] Created `components/wallet/WalletAuth.tsx` - New wallet login component
- [x] Updated login page to use wallet-first auth
- [x] Updated `LeaderboardRow` to handle null Twitter fields
- [x] Updated `ProfileHoverCard` to handle null Twitter fields
- [x] Updated home page leaderboard section
- [x] Updated KOLs page for nullable fields
- [x] Updated profile page with `displayName` fallbacks

### 8. Pump.fun Integration
- [x] Added Pump.fun profile link to profile pages
- [x] Auth success returns `pumpFunProfile` URL
- [x] Login page shows Pump.fun link promotion

### 9. Data Fetching Updates
- [x] `LeaderboardEntry` interface updated for nullable fields
- [x] `ProfileData` interface updated for nullable fields
- [x] `KolLeaderboardEntry` interface updated
- [x] `getLeaderboardData()` returns `primaryWallet`

---

## 🔲 REMAINING TASKS

### 10. Migration Execution
- [ ] Run database migration on production
- [ ] Verify existing users get `primary_wallet` backfilled
- [ ] Test user creation via wallet auth

### 11. Twitter Linking Flow
- [ ] Create `/api/auth/twitter/link` - Link Twitter to wallet-based account
- [ ] Create UI for linking Twitter after wallet login
- [ ] Create settings page to manage Twitter link

### 12. Session Integration
- [ ] Consider merging wallet session with NextAuth session
- [ ] Or create unified session hook that checks both

### 13. Testing
- [ ] Test new user creation via wallet
- [ ] Test existing user login via wallet
- [ ] Test Twitter linking after wallet auth
- [ ] Test profile display for wallet-only users

---

## Files Created/Modified

### New Files
- `lib/wallet-auth.ts`
- `app/api/auth/wallet/nonce/route.ts`
- `app/api/auth/wallet/verify/route.ts`
- `app/api/auth/wallet/disconnect/route.ts`
- `app/api/auth/me/route.ts`
- `components/wallet/WalletAuth.tsx`
- `supabase/migrations/005_wallet_primary_auth.sql`
- `scripts/migrate-wallet-auth.ts`

### Modified Files
- `lib/db.ts` - New wallet-first functions
- `lib/nonce-store.ts` - Public nonce support
- `lib/auth.ts` - Fixed nullable handling
- `lib/data-fetching.ts` - Nullable types + primaryWallet
- `types/database.ts` - Nullable Twitter fields
- `app/(public)/login/page.tsx` - Wallet-first UI
- `app/(public)/page.tsx` - Handle nullable fields
- `app/(public)/leaderboard/page.tsx` - Handle nullable fields
- `app/(public)/kols/page.tsx` - Handle nullable fields
- `app/(public)/profile/[handle]/page.tsx` - Wallet display + Pump.fun link
- `components/leaderboard/LeaderboardRow.tsx` - Nullable handling
- `components/ui/ProfileHoverCard.tsx` - Nullable handling
- `app/api/search/route.ts` - Updated types
