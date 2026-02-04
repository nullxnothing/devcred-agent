# .claude Documentation

This folder contains detailed documentation for Claude AI assistance.

## Documents

| File | Description |
|------|-------------|
| [architecture.md](architecture.md) | System architecture, data flows, database schema |
| [scoring-system.md](scoring-system.md) | Token & dev scoring algorithms, tiers, colors |
| [badge-system.md](badge-system.md) | Achievement badges, tiers, styling |
| [api-reference.md](api-reference.md) | Complete API documentation with examples |

## Quick Links

### Scoring
- Token scores: 0-100 (5 components)
- Dev scores: 0-740 (weighted average + bonuses)
- 8 tiers: Legend → Unverified

### Key APIs
- `GET /api/reputation/{wallet}` - Get score for wallet
- `POST /api/auth/wallet/verify` - Authenticate with wallet
- `GET /api/profile/{handle}` - Get user profile

### Key Files
- `lib/scoring.ts` - Scoring engine
- `lib/badges.ts` - Badge system
- `lib/wallet-auth.ts` - Authentication
- `lib/helius/` - Blockchain data
- `lib/dexscreener.ts` - Market data

## See Also

- `/CLAUDE.md` - Main project overview and commands
- `/docs/plan.md` - Development roadmap
- `/SETUP_GUIDE.md` - Environment setup
