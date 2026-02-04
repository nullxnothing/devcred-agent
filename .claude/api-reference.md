# API Reference

All API routes are in `app/api/`. 

## Base URLs

| Environment | URL |
|-------------|-----|
| Production (Vercel) | `https://devkarma.fun` |
| Agent (Railway) | `https://devkarmaagent-production.up.railway.app` |
| Local | `http://localhost:3000` |

---

## Authentication

### POST `/api/auth/wallet/nonce`

Get a nonce for wallet signature authentication.

**Request:**
```json
{
  "walletAddress": "ABC123..."
}
```

**Response:**
```json
{
  "message": "Sign this message to authenticate with DevCred: ABC123...\n\nNonce: uuid-here",
  "nonce": "uuid-here"
}
```

---

### POST `/api/auth/wallet/verify`

Verify wallet signature and create session.

**Request:**
```json
{
  "walletAddress": "ABC123...",
  "signature": "base58-encoded-signature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "userId": "uuid",
  "walletAddress": "ABC123...",
  "isNewUser": false,
  "pumpFunProfile": "https://pump.fun/profile/ABC123..."
}
```

**Errors:**
- `400` - Missing wallet/signature, invalid format, expired nonce
- `429` - Rate limited

---

### POST `/api/auth/wallet/disconnect`

Clear session cookie and logout.

**Response:**
```json
{
  "success": true
}
```

---

### GET `/api/auth/me`

Get current authenticated user.

**Response (authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "walletAddress": "ABC123...",
    "displayName": "Dev ABC1...3XYZ",
    "pumpFunProfile": "https://pump.fun/profile/ABC123...",
    "pumpFunUsername": "cooldev" // or null
  }
}
```

**Response (not authenticated):**
```json
{
  "authenticated": false,
  "user": null
}
```

---

### NextAuth Routes (Optional Twitter Linking)

| Route | Description |
|-------|-------------|
| `GET /api/auth/signin` | NextAuth sign-in page |
| `GET /api/auth/callback/twitter` | Twitter OAuth callback |
| `POST /api/auth/signout` | Sign out of Twitter session |

---

## Reputation

### GET `/api/reputation/{wallet}`

Get reputation score for a wallet address. Used by Chrome extension.

**Parameters:**
- `wallet` - Solana wallet address (32-44 chars)

**Response:**
```json
{
  "wallet": "ABC123...",
  "score": 485,
  "tier": "proven",
  "tierName": "Proven",
  "tokenCount": 5,
  "rugCount": 0,
  "migrationCount": 2,
  "lastScanned": "2026-02-03T12:00:00Z",
  "source": "cached"
}
```

**Source values:**
- `cached` - Returned from database
- `fresh` - Just scanned (no cached data)

**Errors:**
- `400` - Invalid wallet address format
- `500` - Scan failed

---

## Profiles

### GET `/api/profile/{handle}`

Get user profile by Twitter handle OR wallet address.

**Parameters:**
- `handle` - Twitter handle (without @) OR Solana wallet address

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "twitterHandle": "cooldev",
    "twitterName": "Cool Developer",
    "avatarUrl": "https://...",
    "totalScore": 485,
    "tier": "proven",
    "rank": 42,
    "isVerified": true
  },
  "wallets": [
    {
      "address": "ABC123...",
      "isPrimary": true,
      "label": "Main Wallet"
    }
  ],
  "tokens": [
    {
      "mint": "TOKEN123...",
      "name": "Cool Token",
      "symbol": "COOL",
      "score": 75,
      "migrated": true,
      "athMarketCap": 150000,
      "holderCount": 500,
      "status": "active"
    }
  ],
  "scoreBreakdown": {
    "baseScore": 350,
    "migrationBonus": 100,
    "marketCapBonus": 25,
    "rugPenalties": 0
  }
}
```

**Errors:**
- `404` - User not found

---

### GET `/api/profile/{handle}/badges`

Get badges for a user profile.

**Response:**
```json
{
  "badges": [
    {
      "type": "ath_100k",
      "tier": "gold",
      "label": "$100K ATH",
      "description": "Token reached $100,000 market cap",
      "icon": "Rocket",
      "tokenMint": "TOKEN123...",
      "tokenName": "Cool Token",
      "tokenSymbol": "COOL",
      "value": 150000
    }
  ]
}
```

---

## Leaderboard

### GET `/api/leaderboard`

Get top developers by score.

**Query Parameters:**
- `limit` - Number of results (default: 50, max: 100)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "uuid",
      "twitterHandle": "topdev",
      "twitterName": "Top Developer",
      "avatarUrl": "https://...",
      "score": 720,
      "tier": "legend",
      "tokenCount": 12,
      "migrationCount": 8
    }
  ],
  "total": 50,
  "updatedAt": "2026-02-03T12:00:00Z"
}
```

---

## Search

### GET `/api/search`

Search users, wallets, and tokens.

**Query Parameters:**
- `q` - Search query (min 2 chars)

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "twitterHandle": "cooldev",
      "twitterName": "Cool Developer",
      "avatarUrl": "https://...",
      "primaryWallet": "ABC123...",
      "score": 485,
      "rank": 42
    }
  ],
  "wallet": {
    "address": "ABC123...",
    "userId": "uuid",
    "label": "Main Wallet"
  },
  "token": {
    "mint": "TOKEN123...",
    "name": "Cool Token",
    "symbol": "COOL",
    "creatorWallet": "ABC123..."
  }
}
```

**Notes:**
- If query looks like Solana address, searches wallets/tokens first
- Otherwise searches by Twitter handle/name

---

## Tokens

### GET `/api/token/lookup`

Lookup token by mint address.

**Query Parameters:**
- `mint` - Token mint address

**Response:**
```json
{
  "mint": "TOKEN123...",
  "name": "Cool Token",
  "symbol": "COOL",
  "creatorWallet": "ABC123...",
  "alreadyClaimed": false
}
```

**Errors:**
- `400` - Mint address required
- `404` - Token not found

---

### POST `/api/token/claim`

Claim a token to your profile.

**Request:**
```json
{
  "mintAddress": "TOKEN123..."
}
```

**Response:**
```json
{
  "success": true,
  "token": {
    "mint": "TOKEN123...",
    "name": "Cool Token",
    "symbol": "COOL"
  }
}
```

**Errors:**
- `401` - Not authenticated
- `400` - Invalid mint / already claimed
- `403` - Not the creator of this token

---

## User

### POST `/api/user/sync`

Trigger wallet rescan for current user.

**Response:**
```json
{
  "success": true,
  "tokensScanned": 5,
  "newScore": 485
}
```

---

### POST `/api/user/pumpfun-username`

Set pump.fun display name.

**Request:**
```json
{
  "username": "cooldev"
}
```

**Response:**
```json
{
  "success": true,
  "username": "cooldev"
}
```

---

## Health

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-03T12:00:00Z",
  "service": "devkarma" // or "devcred-agent" on Railway
}
```

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/api/auth/wallet/nonce` | 10/min per IP |
| `/api/auth/wallet/verify` | 5/min per IP+wallet |
| `/api/reputation/*` | 60/min per IP |
| Other endpoints | 100/min per IP |

Rate limit headers:
- `X-RateLimit-Limit` - Max requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Unix timestamp when limit resets

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

Common status codes:
- `400` - Bad request (invalid input)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not allowed)
- `404` - Not found
- `429` - Rate limited
- `500` - Internal server error
