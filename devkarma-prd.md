# DevKarma - Product Requirements Document

**Version:** 1.0  
**Date:** January 27, 2026  
**Author:** Dylan  

---

## Executive Summary

DevKarma is a developer reputation platform for Solana token creators. It provides verified developer profiles with on-chain proof of their launch history, enabling degens to quickly assess whether a dev is trustworthy before aping into their tokens.

**Core Value Proposition:** "Prove Your History" — A credit score for crypto devs.

**Key Differentiator:** First platform that distinguishes between "fizzled" tokens (didn't gain traction) and "rugged" tokens (dev dumped on holders), rewarding legitimate builders with portable reputation.

---

## Problem Statement

### The Problem
1. **For Degens:** No way to quickly verify if a dev is legitimate before buying their token
2. **For Devs:** No way to prove track record across launches; "greasy wallet" reputation follows good devs
3. **Existing Tools:** Only track bad actors (rug detection) rather than rewarding good actors

### Market Gap

| Existing Tool | What It Does | What's Missing |
|---------------|--------------|----------------|
| RugCheck | Binary safety check | No dev profiles, no history |
| Kolscan | Tracks KOL traders | Not dev-focused |
| Solscan | Token verification | No reputation scoring |
| Nansen | Whale tracking | No dev profiles |

**DevKarma fills:** Verified dev profiles with portable reputation across launches.

---

## Product Overview

### Two-Sided Platform

**Side A: Public Leaderboard (Anonymous)**
- Search any wallet → get instant score
- Top devs ranked by success metrics
- No login required

**Side B: Verified Profiles (Authenticated)**
- Devs create profile via Twitter OAuth
- Connect wallets via signature verification
- Claim past launches and build reputation
- Shareable profile link for marketing

### Core Flow

```
Dev signs up (Twitter OAuth)
         ↓
Connects wallet(s) via signature
         ↓
System pulls all tokens launched from wallets
         ↓
Each token gets scored (0-150 points)
         ↓
Scores aggregate into Dev Score (0-740)
         ↓
Public profile with shareable link
```

---

## Scoring System

### Dev Score Range: 0-740

Score is a weighted average of all token scores, capped at 740 (like credit scores).

### Per-Token Scoring (0-150 max)

| Factor | Points | How to Measure |
|--------|--------|----------------|
| **Migrated to Raydium/PumpSwap** | +50 | On-chain: bonding curve completed |
| **ATH Market Cap** | +1 to +30 | DexScreener API: `marketCap` field |
| **Holder Retention (7d)** | +1 to +20 | Compare holder count at ATH vs 7d later |
| **Dev Didn't Dump** | +1 to +20 | Analyze dev wallet sell patterns |
| **Bundle % Low** | +1 to +15 | < 5% bundled = good |
| **Longevity** | +1 to +10 | Days token actively traded |
| **Community Exists** | +1 to +5 | TG/Discord linked and active |
| **RUG CONFIRMED** | **-100** | LP pulled, dev dumped >50% supply |

### Key Insight: Fizzled ≠ Rugged

A dev with:
- 2 migrations (+160)
- 5 fizzles (+50)
- 0 rugs (+0)
- **Total: ~680 score = "Proven Builder"**

This incentivizes devs to add ALL their history, even failures.

### Account Tiers

| Tier | Requirements |
|------|--------------|
| **Unverified** | Just signed up |
| **Verified** | 1+ wallet connected |
| **Builder** | 3+ tokens launched |
| **Proven** | 1+ migration |
| **Elite** | 3+ migrations, 700+ score |
| **Legend** | 5+ migrations, 720+ score, 6+ months history |

---

## Technical Architecture

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | Next.js 14 + TypeScript |
| **Styling** | Tailwind CSS |
| **Backend** | Next.js API Routes |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | NextAuth.js (Twitter OAuth) |
| **Blockchain Data** | Helius API |
| **Market Data** | DexScreener API |
| **Wallet Connection** | @solana/wallet-adapter |

### Database Schema

```sql
-- Users (devs)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twitter_id VARCHAR UNIQUE NOT NULL,
  twitter_handle VARCHAR NOT NULL,
  twitter_avatar VARCHAR,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Wallets (verified dev wallets)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  address VARCHAR(44) UNIQUE NOT NULL,
  verified_at TIMESTAMP DEFAULT NOW(),
  signature VARCHAR -- stored signature for proof
);

-- Tokens (launched by devs)
CREATE TABLE tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mint_address VARCHAR(44) UNIQUE NOT NULL,
  wallet_id UUID REFERENCES wallets(id),
  name VARCHAR,
  symbol VARCHAR,
  image_url VARCHAR,
  launched_at TIMESTAMP,
  migrated BOOLEAN DEFAULT FALSE,
  migration_type VARCHAR, -- 'raydium' | 'pumpswap' | null
  ath_market_cap DECIMAL,
  ath_timestamp TIMESTAMP,
  current_market_cap DECIMAL,
  holder_count INTEGER,
  holder_count_ath INTEGER,
  is_rugged BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  score_breakdown JSONB,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Score History (for tracking changes)
CREATE TABLE score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  score INTEGER NOT NULL,
  tier VARCHAR NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Profile Views (analytics)
CREATE TABLE profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  viewer_ip VARCHAR,
  viewed_at TIMESTAMP DEFAULT NOW()
);
```

---

## Helius API Integration

### Overview

Helius provides the most comprehensive Solana API for our needs:
- **Endpoint:** `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- **Rate Limits:** Varies by plan (Free: 10 RPS, Business: 100+ RPS)

### Key Endpoints We Need

#### 1. Get Tokens Launched by Wallet

**Method:** `getAssetsByOwner` + filter for created tokens

```javascript
// Get all assets where wallet is the authority/creator
const getTokensCreatedByWallet = async (walletAddress) => {
  const response = await fetch(HELIUS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'devkarma',
      method: 'getAssetsByCreator',
      params: {
        creatorAddress: walletAddress,
        onlyVerified: false,
        page: 1,
        limit: 1000,
      },
    }),
  });
  return response.json();
};
```

#### 2. Get Token Holders Count

**Method:** `getTokenAccounts` with mint filter

```javascript
// Get all holders of a specific token
const getTokenHolders = async (mintAddress) => {
  let allHolders = [];
  let cursor = null;
  
  do {
    const response = await fetch(HELIUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'devkarma',
        method: 'getTokenAccounts',
        params: {
          mint: mintAddress,
          limit: 1000,
          ...(cursor && { cursor }),
        },
      }),
    });
    
    const data = await response.json();
    allHolders.push(...data.result.token_accounts);
    cursor = data.result.cursor;
  } while (cursor);
  
  // Deduplicate by owner
  const uniqueHolders = [...new Set(allHolders.map(a => a.owner))];
  return uniqueHolders.length;
};
```

#### 3. Get Transaction History for Wallet

**Method:** `getTransactionsForAddress` (Enhanced)

```javascript
// Get parsed transaction history
const getWalletTransactions = async (walletAddress) => {
  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/addresses/${walletAddress}/transactions?api-key=${API_KEY}`
  );
  return response.json();
};
```

#### 4. Parse Token Transfers (Detect Dev Dumps)

**Method:** Enhanced Transactions API with type filter

```javascript
// Get all token transfers for analysis
const getTokenTransfers = async (walletAddress, mintAddress) => {
  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/addresses/${walletAddress}/transactions?api-key=${API_KEY}&type=TRANSFER`
  );
  
  const txs = await response.json();
  
  // Filter for specific token
  return txs.filter(tx => 
    tx.tokenTransfers?.some(t => t.mint === mintAddress)
  );
};
```

#### 5. Detect Token Creation (pump.fun Launch)

**Method:** Enhanced Transactions with `TOKEN_MINT` type

```javascript
// Find when a token was created
const getTokenCreationTx = async (mintAddress) => {
  const response = await fetch(
    `https://api-mainnet.helius-rpc.com/v0/addresses/${mintAddress}/transactions?api-key=${API_KEY}&type=TOKEN_MINT`
  );
  return response.json();
};
```

### Helius API Response Examples

#### getAssetsByOwner Response
```json
{
  "result": {
    "items": [
      {
        "id": "TokenMintAddress...",
        "content": {
          "metadata": {
            "name": "$CATWIF",
            "symbol": "CATWIF"
          }
        },
        "token_info": {
          "supply": 1000000000,
          "decimals": 6,
          "price_info": {
            "price_per_token": 0.00001234,
            "total_price": 12340.00
          }
        },
        "authorities": [
          {
            "address": "CreatorWalletAddress...",
            "scopes": ["full"]
          }
        ]
      }
    ]
  }
}
```

#### getTokenAccounts Response
```json
{
  "result": {
    "total": 12847,
    "limit": 1000,
    "cursor": "nextPageCursor...",
    "token_accounts": [
      {
        "address": "TokenAccountAddress...",
        "mint": "TokenMintAddress...",
        "owner": "HolderWalletAddress...",
        "amount": 1000000,
        "frozen": false
      }
    ]
  }
}
```

---

## DexScreener API Integration

### Overview

DexScreener provides market data (price, market cap, liquidity).
- **Base URL:** `https://api.dexscreener.com`
- **Rate Limit:** 300 requests/minute for most endpoints

### Key Endpoints

#### 1. Get Token Market Data

**Endpoint:** `GET /tokens/v1/{chainId}/{tokenAddresses}`

```javascript
const getTokenMarketData = async (mintAddress) => {
  const response = await fetch(
    `https://api.dexscreener.com/tokens/v1/solana/${mintAddress}`
  );
  return response.json();
};
```

**Response:**
```json
[
  {
    "chainId": "solana",
    "dexId": "raydium",
    "pairAddress": "PoolAddress...",
    "baseToken": {
      "address": "TokenMintAddress...",
      "name": "$CATWIF",
      "symbol": "CATWIF"
    },
    "priceUsd": "0.00001234",
    "liquidity": {
      "usd": 45000,
      "base": 1000000000,
      "quote": 234
    },
    "fdv": 12340,
    "marketCap": 12340,
    "pairCreatedAt": 1706123456789,
    "txns": {
      "h24": { "buys": 1234, "sells": 567 }
    },
    "volume": {
      "h24": 89000
    },
    "priceChange": {
      "h24": 15.5
    }
  }
]
```

#### 2. Search Token by Name

**Endpoint:** `GET /latest/dex/search?q={query}`

```javascript
const searchToken = async (query) => {
  const response = await fetch(
    `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`
  );
  return response.json();
};
```

#### 3. Get Token Pairs/Pools

**Endpoint:** `GET /token-pairs/v1/{chainId}/{tokenAddress}`

```javascript
const getTokenPools = async (mintAddress) => {
  const response = await fetch(
    `https://api.dexscreener.com/token-pairs/v1/solana/${mintAddress}`
  );
  return response.json();
};
```

---

## Pump.fun / Migration Detection

### How Migrations Work

1. Token launches on pump.fun with bonding curve
2. When bonding curve reaches ~$69K market cap (100% sold)
3. Token "graduates" and migrates to:
   - **PumpSwap** (since March 2025, default)
   - **Raydium** (legacy, still some tokens)

### Detecting Migration Status

**Option 1: Check Bonding Curve Status**

The pump.fun migration account is: `39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg`

```javascript
const PUMPFUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMPFUN_MIGRATION = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';

// Check if token has migrated by looking for pool on Raydium/PumpSwap
const checkMigrationStatus = async (mintAddress) => {
  const pools = await getTokenPools(mintAddress);
  
  if (!pools || pools.length === 0) {
    return { migrated: false, type: null };
  }
  
  // Check which DEX
  const raydiumPool = pools.find(p => p.dexId === 'raydium');
  const pumpswapPool = pools.find(p => p.dexId === 'pumpswap' || p.dexId === 'pump');
  
  if (raydiumPool) {
    return { migrated: true, type: 'raydium', pool: raydiumPool };
  }
  if (pumpswapPool) {
    return { migrated: true, type: 'pumpswap', pool: pumpswapPool };
  }
  
  return { migrated: false, type: null };
};
```

**Option 2: Check DexScreener Liquidity**

If token has liquidity > $10K on a DEX, it has migrated.

```javascript
const hasMigrated = (dexScreenerData) => {
  return dexScreenerData.some(pair => 
    pair.liquidity?.usd > 10000 && 
    (pair.dexId === 'raydium' || pair.dexId === 'pumpswap')
  );
};
```

---

## Wallet Verification Flow

### How It Works

1. User enters wallet address
2. Backend generates unique message: `Verify wallet for DevKarma: ${nonce}`
3. User signs message with wallet
4. Backend verifies signature matches wallet
5. Wallet linked to profile

### Implementation

```javascript
import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Generate verification message
const generateVerificationMessage = (walletAddress, nonce) => {
  return `Verify wallet for DevKarma: ${nonce}\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
};

// Verify signature
const verifyWalletSignature = (
  walletAddress,
  message,
  signature
) => {
  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};
```

---

## API Routes

### Authentication

```
POST /api/auth/twitter     # Twitter OAuth callback
POST /api/auth/logout      # Logout
GET  /api/auth/session     # Get current session
```

### Wallets

```
GET  /api/wallets                    # Get user's wallets
POST /api/wallets/verify             # Start verification
POST /api/wallets/confirm            # Confirm with signature
DELETE /api/wallets/:address         # Remove wallet
```

### Profiles

```
GET /api/profiles/:handle            # Get public profile
GET /api/profiles/:handle/tokens     # Get token history
GET /api/profiles/:handle/score      # Get score breakdown
```

### Search

```
GET /api/search/wallet/:address      # Search wallet (no auth)
GET /api/search/token/:mint          # Search token
```

### Leaderboard

```
GET /api/leaderboard                 # Top devs
GET /api/leaderboard/weekly          # Weekly top
```

---

## Frontend Pages

### Public Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, how it works, leaderboard preview |
| `/leaderboard` | Full leaderboard with filters |
| `/search` | Search any wallet |
| `/profile/:handle` | Public dev profile |

### Authenticated Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | User's dashboard |
| `/dashboard/wallets` | Manage connected wallets |
| `/dashboard/settings` | Profile settings |

---

## Scoring Algorithm Implementation

```javascript
const calculateTokenScore = async (token, devWallet) => {
  let score = 0;
  const breakdown = {};
  
  // 1. Migration bonus (+50)
  if (token.migrated) {
    score += 50;
    breakdown.migration = 50;
  }
  
  // 2. ATH Market Cap (+1 to +30)
  const athScore = Math.min(30, Math.floor(token.ath_market_cap / 100000));
  score += athScore;
  breakdown.athMarketCap = athScore;
  
  // 3. Holder Retention (+1 to +20)
  if (token.holder_count_ath > 0) {
    const retention = token.holder_count / token.holder_count_ath;
    const retentionScore = Math.min(20, Math.floor(retention * 20));
    score += retentionScore;
    breakdown.holderRetention = retentionScore;
  }
  
  // 4. Dev Didn't Dump (+1 to +20)
  const devSellPattern = await analyzeDevSellPattern(devWallet, token.mint_address);
  const dumpScore = Math.max(0, 20 - devSellPattern.dumpSeverity);
  score += dumpScore;
  breakdown.devBehavior = dumpScore;
  
  // 5. Bundle % Low (+1 to +15)
  const bundlePercent = await getBundlePercent(token.mint_address);
  const bundleScore = bundlePercent < 5 ? 15 : bundlePercent < 10 ? 10 : bundlePercent < 20 ? 5 : 0;
  score += bundleScore;
  breakdown.bundleBehavior = bundleScore;
  
  // 6. Longevity (+1 to +10)
  const daysActive = (Date.now() - token.launched_at) / (1000 * 60 * 60 * 24);
  const longevityScore = Math.min(10, Math.floor(daysActive / 7));
  score += longevityScore;
  breakdown.longevity = longevityScore;
  
  // 7. Rug Penalty (-100)
  if (token.is_rugged) {
    score -= 100;
    breakdown.rugPenalty = -100;
  }
  
  return { score: Math.max(0, score), breakdown };
};

const calculateDevScore = (tokens) => {
  if (tokens.length === 0) return 0;
  
  const totalScore = tokens.reduce((sum, t) => sum + t.score, 0);
  const avgScore = totalScore / tokens.length;
  
  // Weight by number of tokens (more launches = more reliable data)
  const weightedScore = avgScore * Math.min(1, tokens.length / 5);
  
  // Cap at 740
  return Math.min(740, Math.round(weightedScore * 5));
};
```

---

## Design System

### Brand

| Element | Value |
|---------|-------|
| **Name** | DevKarma |
| **Tagline** | "Prove Your History" |
| **Logo** | Karma cycle (brushstroke) in shield |
| **Vibe** | Organic, authentic, trustworthy |

### Colors

```css
:root {
  --cream: #EDE8DF;
  --cream-dark: #E0D9CC;
  --forest: #3D5A3D;
  --forest-dark: #2D4A2D;
  --forest-light: #4A6B4A;
  --text: #2D3D2D;
  --text-muted: #6B7B6B;
  --border: #C9C2B5;
  --accent: #8B7355;
}
```

### Typography

| Use | Font |
|-----|------|
| **Headlines** | Permanent Marker (brush) |
| **Body** | DM Sans |
| **Scores/Code** | JetBrains Mono |

---

## MVP Scope (Phase 1)

### Must Have
- [ ] Twitter OAuth login
- [ ] Wallet verification via signature
- [ ] Auto-pull token history from connected wallets
- [ ] Basic scoring (migration + ATH)
- [ ] Public profile page
- [ ] Shareable profile link
- [ ] Search any wallet

### Nice to Have
- [ ] Leaderboard
- [ ] Score breakdown visualization
- [ ] Profile view analytics

### Out of Scope (Phase 2+)
- [ ] GitHub verification
- [ ] Vouch system
- [ ] API for other apps
- [ ] Badge NFTs
- [ ] Token

---

## Build Prompts for Claude Code

### Prompt 1: Project Setup
```
Create a new Next.js 14 project with TypeScript, Tailwind CSS, and Supabase.

Structure:
/app
  /api
    /auth
    /wallets
    /profiles
    /search
  /(public)
    /page.tsx (homepage)
    /leaderboard
    /profile/[handle]
    /search
  /(authenticated)
    /dashboard
/components
  /ui (buttons, cards, badges)
  /layout (nav, footer)
  /profile (score card, token list)
/lib
  /helius.ts
  /dexscreener.ts
  /scoring.ts
  /supabase.ts
/types

Use the design system colors and fonts from the PRD.
```

### Prompt 2: Database Setup
```
Set up Supabase with the following tables:
- users (twitter auth)
- wallets (verified wallets)
- tokens (launched tokens)
- score_history
- profile_views

Include RLS policies:
- Users can only read/write their own data
- Profiles are publicly readable
- Wallets can only be added by owner

Create the SQL migrations.
```

### Prompt 3: Helius Integration
```
Create /lib/helius.ts with these functions:
- getTokensCreatedByWallet(address)
- getTokenHolders(mintAddress)
- getWalletTransactions(address)
- getTokenTransfers(wallet, mint)

Use the Helius API key from env.
Handle pagination for large results.
Include rate limiting.
```

### Prompt 4: DexScreener Integration
```
Create /lib/dexscreener.ts with:
- getTokenMarketData(mintAddress)
- getTokenPools(mintAddress)
- checkMigrationStatus(mintAddress)

Cache results for 5 minutes.
Handle rate limits (300/min).
```

### Prompt 5: Scoring Engine
```
Create /lib/scoring.ts with:
- calculateTokenScore(token, devWallet)
- calculateDevScore(tokens[])
- getTier(score)

Implement the scoring algorithm from PRD.
Include score breakdown for UI.
```

### Prompt 6: Auth Flow
```
Implement Twitter OAuth with NextAuth.js:
- /api/auth/[...nextauth]
- Twitter provider config
- Session handling
- Protected route middleware
```

### Prompt 7: Wallet Verification
```
Create wallet verification flow:
- /api/wallets/verify - generate message
- /api/wallets/confirm - verify signature
- Frontend component for wallet connection
- Use @solana/wallet-adapter
```

### Prompt 8: Homepage
```
Build the homepage with:
- Hero section (tagline, CTA buttons)
- How it works (3 steps)
- Leaderboard preview (top 5)
- Footer

Use the V4 design (brushstroke, cream/forest green).
```

### Prompt 9: Profile Page
```
Build /profile/[handle] with:
- Profile header (avatar, name, tier badge)
- Score card (big number, progress bar, seal)
- Stats row (launches, migrations, rugs)
- Token history table
- Share buttons

Make it shareable (OG image generation).
```

### Prompt 10: Dashboard
```
Build authenticated dashboard:
- Connected wallets list
- Add wallet flow
- Score overview
- Token history with refresh
```

---

## Success Metrics

| Metric | Target (Month 1) |
|--------|------------------|
| Registered devs | 500 |
| Verified profiles | 100 |
| Profile views | 10,000 |
| Twitter mentions | 50 |

---

## Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: MVP | 2 weeks | Core platform, profiles, scoring |
| Phase 2: Polish | 1 week | Leaderboard, analytics, OG images |
| Phase 3: Growth | Ongoing | API, integrations, token |

---

## Appendix: API Keys Needed

| Service | Purpose | Get At |
|---------|---------|--------|
| Helius | Solana data | dashboard.helius.dev |
| Supabase | Database | supabase.com |
| Twitter OAuth | Auth | developer.twitter.com |

---

## Appendix: Useful Links

- Helius Docs: https://www.helius.dev/docs
- DexScreener API: https://docs.dexscreener.com/api/reference
- Solana Wallet Adapter: https://github.com/solana-labs/wallet-adapter
- NextAuth.js: https://next-auth.js.org
