# DevKarma — Codebase Improvement & Feature Expansion Plan

## Overview

**DevKarma** is a developer reputation platform for Solana token creators that calculates a "DevCred Score" (0-740) based on on-chain launch history. The platform distinguishes between legitimate developers and bad actors by analyzing token migrations, market performance, holder retention, and rug patterns.

### Major Components
- **Frontend**: Next.js 16 App Router with React 19, Tailwind CSS 4
- **Backend**: Next.js API routes with raw PostgreSQL (`pg` pool)
- **Authentication**: Dual system - Twitter OAuth (NextAuth.js) + Wallet-first auth (custom JWT)
- **Blockchain Integration**: Helius API (Solana DAS), DexScreener, GeckoTerminal
- **Database**: Railway PostgreSQL with `dk_` prefixed tables

### Inferred Purpose
Enable crypto traders to quickly verify developer reputation before buying tokens, while allowing legitimate developers to build portable, verifiable reputation across launches.

---

## 1. Codebase Audit

### Architecture Analysis
- [x] Identified hybrid route group structure: `(public)/` for public pages, `(authenticated)/` empty
- [x] Core lib modules: `helius/`, `dexscreener.ts`, `scoring.ts`, `db.ts`, `wallet-auth.ts`
- [ ] **Consolidate rate limiter implementations** - Currently have `rate-limiter.ts` and `api-rate-limiter.ts` with overlapping concerns
- [ ] **Review Supabase remnant** - `lib/supabase.ts` exists but project uses raw `pg` pool (see `db.ts`)
- [ ] **Clean up dual auth system** - NextAuth + custom wallet JWT creates session confusion

### Technical Debt
- [ ] **Remove unused `frontend-idea/` directory** - Contains a separate Vite/React project that appears to be an early prototype
- [ ] **Consolidate token detection logic** - `lib/token-detection.ts` (525+ lines) and `lib/helius/token-scanner.ts` have overlapping functionality
- [ ] **Refactor `lib/data-fetching.ts`** - 468 lines, handles too many concerns (user resolution, token scanning, profile data, leaderboard)
- [ ] **Address profile-service split** - `lib/profile-service.ts` was created to break down `data-fetching.ts` but migration is incomplete
- [ ] **Review script proliferation** - 35+ scripts in `/scripts` with unclear organization and potentially deprecated ones

### Performance Bottlenecks
- [ ] **In-memory caching** - `lib/cache.ts` uses in-memory Maps (not horizontally scalable)
- [ ] **Nonce storage** - `lib/nonce-store.ts` uses in-memory storage (single-server only)
- [ ] **N+1 queries in profile loading** - Token enrichment fetches market data individually
- [ ] **No connection pooling optimization** - pg Pool configured but not tuned for serverless

### Code Consistency
- [ ] **Inconsistent error handling** - Mix of try/catch, null returns, and unhandled promise rejections
- [ ] **Type safety gaps** - `metadata` columns use `JSONB` without runtime validation
- [ ] **Component naming** - Mix of PascalCase files and index.ts barrel exports

---

## 2. Project Setup

### Repository Structure
- [ ] **Create `/docs` directory structure**:
  - `/docs/api/` - API documentation
  - `/docs/architecture/` - System diagrams
  - `/docs/deployment/` - Deploy guides
- [ ] **Move existing docs** - `devkarma-prd.md`, `devkarma-tasks.md` to `/docs`
- [ ] **Archive `frontend-idea/`** - Move to separate branch or remove entirely
- [ ] **Organize scripts** by purpose:
  - `/scripts/migrations/` - DB migrations
  - `/scripts/maintenance/` - Data backfill, cleanup
  - `/scripts/testing/` - Validation, debugging

### Environment Management
- [ ] **Create `.env.example`** with all required variables documented
- [ ] **Validate env at startup** - Add schema validation for required vars
- [ ] **Document Railway-specific config** - SSL settings, connection pooling

### CI/CD Setup
- [ ] **Add GitHub Actions workflow** for:
  - Linting (ESLint)
  - Type checking (tsc --noEmit)
  - Build verification
- [ ] **Add Vercel preview deployments** for PRs
- [ ] **Add database migration checks** in CI

### Dependency Audit
- [ ] **Review `@supabase/supabase-js`** - Listed in deps but using raw `pg`
- [ ] **Pin exact versions** - Currently using `^` ranges
- [ ] **Run `npm audit`** and fix vulnerabilities
- [ ] **Update Playwright** - Version 1.58.0 listed but likely unused (no test files found)

---

## 3. Backend Analysis & Improvements

### API Structure Review
- [ ] **Document all API routes** - Currently have:
  - `/api/auth/` - NextAuth + wallet auth
  - `/api/profile/[handle]` - Public profile data
  - `/api/leaderboard` - Top devs
  - `/api/search` - Wallet/token search
  - `/api/token` - Token operations
  - `/api/user/sync` - Data refresh
  - `/api/wallet/` - Wallet verification (legacy)
  - `/api/wallets/` - Additional wallet endpoints
- [ ] **Consolidate `/api/wallet` and `/api/wallets`** - Redundant route groups

### Database Improvements
- [ ] **Add `dk_nonces` table** - Migration `20260128_add_wallet_nonces_table.sql` exists but unclear if applied
- [ ] **Add indexes for common queries**:
  - `dk_tokens.status` - Filter by active/rug
  - `dk_users.primary_wallet` - Wallet-first lookups
  - Composite: `(creator_wallet, launch_date)` - Timeline queries
- [ ] **Add `dk_api_logs` table** - Track API usage, errors, rate limits
- [ ] **Schema for score history breakdown** - Currently stores blob, should be structured

### Missing Endpoints
- [x] **`POST /api/auth/twitter/link`** - Link Twitter to wallet-based account ✅ Handled in NextAuth signIn callback
- [x] **`DELETE /api/wallets/:address`** - Remove linked wallet ✅ Implemented at `/api/wallets/[address]/route.ts`
- [ ] **`GET /api/profiles/:handle/score`** - Detailed score breakdown endpoint
- [ ] **`GET /api/leaderboard/weekly`** - Weekly top performers

### Data Validation
- [ ] **Add Zod schemas** for API request/response validation
- [ ] **Validate wallet addresses** consistently across all endpoints
- [ ] **Add metadata type guards** for JSONB fields

### Error Handling
- [ ] **Create standardized error response format**:
  ```typescript
  { error: string, code: string, details?: object }
  ```
- [ ] **Add error logging service** - Consider Sentry integration
- [ ] **Handle Helius API failures gracefully** - Fallback behavior for rate limits

### Caching Strategy
- [ ] **Migrate to Redis** for horizontal scaling:
  - Session storage
  - Nonce storage
  - Rate limit counters
  - Market data cache
- [ ] **Add cache invalidation strategy** for profile updates
- [ ] **Implement stale-while-revalidate** for leaderboard data

---

## 4. Frontend Analysis & Improvements

### Component Hierarchy
- [ ] **Complete `(authenticated)/` route group** - Currently empty despite PRD specifying:
  - `/dashboard` - User overview (exists in `(public)/` but should be protected)
  - `/dashboard/wallets` - Manage connected wallets
  - `/dashboard/settings` - Profile settings
- [ ] **Add auth middleware** - Protect authenticated routes properly
- [ ] **Create shared layout** for authenticated pages with navigation

### UI/UX Inconsistencies
- [ ] **Standardize button variants** - `Button.tsx` has good foundation, ensure consistent usage
- [ ] **Add loading states** to all data-fetching components
- [ ] **Implement skeleton loaders** for profile and leaderboard pages
- [ ] **Add empty states** for zero-token profiles

### Accessibility
- [ ] **Add ARIA labels** to interactive elements (WalletConnect, SearchBar)
- [ ] **Ensure keyboard navigation** for modal dialogs
- [ ] **Add focus indicators** consistent with design system
- [ ] **Test with screen reader** and fix issues

### Mobile Responsiveness
- [ ] **Review leaderboard on mobile** - Table layout may not work well
- [ ] **Optimize profile page** for smaller screens
- [ ] **Add mobile-specific navigation** (hamburger menu)

### Design System
- [ ] **Document color tokens** - Currently in `globals.css`, should be in design docs
- [ ] **Create component documentation** (Storybook or similar)
- [ ] **Standardize spacing scale** - Mix of arbitrary values and Tailwind defaults

### State Management
- [ ] **Add React Query/SWR** for server state caching
- [ ] **Create unified session hook** - Currently checks NextAuth and wallet session separately
- [ ] **Add optimistic updates** for wallet verification flow

### Performance Optimizations
- [ ] **Add `loading.tsx` files** for route segments
- [ ] **Implement React Suspense boundaries**
- [ ] **Add image optimization** - Profile avatars, token logos
- [ ] **Lazy load heavy components** - Token history table, charts

---

## 5. Integration & Feature Expansion

### Existing Integrations
| Integration | Status | Issues |
|-------------|--------|--------|
| Helius API | ✅ Working | Rate limiting is 10 RPS, may need tier upgrade |
| DexScreener | ✅ Working | 300/min rate limit, caching effective |
| GeckoTerminal | ✅ Fallback | 30/min limit, used when DexScreener fails |
| Twitter OAuth | ✅ Working | Profile structure quirks documented |
| Solana Wallet Adapter | ✅ Working | Supports Phantom, Solflare |

### Missing Integrations
- [ ] **Pump.fun API** - Direct integration for creator profiles (currently just URL generation)
- [ ] **Jupiter API** - Token swap data for volume verification
- [ ] **Birdeye API** - Alternative market data source
- [ ] **CoinGecko API** - Historical price data for ATH verification

### Planned Features (from PRD)
- [ ] **OG Image generation** - Dynamic social share images for profiles
- [ ] **Score history chart** - Visual timeline of score changes
- [ ] **Token comparison** - Compare multiple tokens side-by-side
- [ ] **Developer alerts** - Notify when tracked dev launches new token
- [ ] **Watchlist** - Save favorite devs for quick access
- [ ] **Badge system** - Achievement badges beyond tier (e.g., "First Migration", "Diamond Hands")

### New Feature Recommendations
- [ ] **Portfolio tracker** - Show all tokens from followed devs
- [ ] **Rug probability score** - ML-based rug prediction
- [ ] **Social proof integration** - Show Twitter follower count, engagement
- [ ] **API access** - Public API for third-party integrations
- [ ] **Webhook notifications** - Alert when watched dev launches or rugs
- [ ] **Browser extension** - Show DevKarma score on Pump.fun, DEXs

---

## 6. Testing & QA

### Unit Testing (0% coverage currently)
- [ ] **Set up Jest/Vitest** with TypeScript support
- [ ] **Test scoring engine** - `lib/scoring.ts` is business-critical
  - Token score calculation
  - Dev score aggregation
  - Tier assignment logic
- [ ] **Test database helpers** - `lib/db.ts` CRUD operations
- [ ] **Test rate limiters** - Both RateLimiter class and API limiter

### Integration Testing
- [ ] **Test API routes** with mocked database
- [ ] **Test wallet verification flow** end-to-end
- [ ] **Test profile resolution** - Twitter handle vs wallet address

### E2E Testing
- [ ] **Set up Playwright** (already in devDependencies)
- [ ] **Test critical user flows**:
  - Landing page → Search wallet → View profile
  - Login with wallet → View dashboard
  - Connect additional wallet → Verify tokens detected
- [ ] **Test cross-browser** - Chrome, Firefox, Safari

### CI Integration
- [ ] **Add test workflow** in GitHub Actions
- [ ] **Set coverage thresholds** - Start at 20%, increase to 60%+
- [ ] **Add visual regression tests** for key pages

---

## 7. Documentation

### API Documentation
- [ ] **Create OpenAPI/Swagger spec** for all endpoints
- [ ] **Document rate limits** per endpoint
- [ ] **Add request/response examples**
- [ ] **Document error codes** and handling

### README Improvements
- [ ] **Replace default Next.js README** with project-specific:
  - Project description and purpose
  - Tech stack overview
  - Quick start guide
  - Environment setup
  - Deployment instructions
  - Contributing guidelines
- [ ] **Add badges** - Build status, coverage, license

### Architecture Documentation
- [ ] **Create system architecture diagram** showing:
  - Data flow: User → API → Helius/DexScreener → DB
  - Authentication flow (both Twitter and Wallet)
  - Caching layers
- [ ] **Document database schema** with ER diagram
- [ ] **Document scoring algorithm** with examples

### Developer Onboarding
- [ ] **Update `SETUP_GUIDE.md`** with Railway PostgreSQL setup
- [ ] **Document local development** with sample data seeding
- [ ] **Create API key acquisition guide** for all integrations
- [ ] **Add troubleshooting section** for common issues

---

## 8. Deployment & Monitoring

### Build Pipeline
- [ ] **Optimize Docker build** (if using containers)
- [ ] **Add build-time environment validation**
- [ ] **Configure Vercel project settings**:
  - Build command
  - Environment variables
  - Function regions (optimize for Solana RPC proximity)

### Staging Environment
- [ ] **Create staging database** on Railway
- [ ] **Set up staging deployment** on Vercel
- [ ] **Add staging-specific env vars**
- [ ] **Seed staging with test data**

### Error Tracking
- [ ] **Integrate Sentry** for error tracking
- [ ] **Set up error alerting** - Slack/Discord integration
- [ ] **Add source maps** for production debugging

### Performance Monitoring
- [ ] **Add Vercel Analytics** (free tier)
- [ ] **Monitor API response times** - Consider Datadog or similar
- [ ] **Set up uptime monitoring** - UptimeRobot or Checkly
- [ ] **Monitor database performance** - Railway metrics + slow query logging

### Logging
- [ ] **Implement structured logging** - JSON format for log aggregation
- [ ] **Add request ID tracking** across API calls
- [ ] **Log critical events**:
  - Authentication success/failure
  - Wallet verification
  - Score calculations
  - API rate limit hits

---

## 9. Maintenance & Future Growth

### Bug Triage
- [ ] **Set up issue templates** in GitHub
- [ ] **Define severity levels** and SLAs
- [ ] **Create bug report workflow**

### Dependency Management
- [ ] **Set up Dependabot** for automated updates
- [ ] **Schedule monthly dependency review**
- [ ] **Document breaking change handling**

### Data Management
- [ ] **Implement data retention policy** for:
  - Score history (keep 12 months)
  - Profile views (keep 30 days)
  - Nonces (expire after 5 minutes)
- [ ] **Add database backup strategy** - Railway automatic backups
- [ ] **Document data recovery procedures**

### Scalability Preparation
- [ ] **Plan Redis migration** for caching layer
- [ ] **Design read replica strategy** for DB scaling
- [ ] **Consider edge caching** for leaderboard data
- [ ] **Evaluate Helius tier upgrade** path for higher RPS

### Developer Experience
- [ ] **Add VSCode settings** for project consistency
- [ ] **Create component templates** for common patterns
- [ ] **Document coding standards** specific to project
- [ ] **Add pre-commit hooks** for linting and type checking

---

## Priority Matrix

### P0 - Critical (Week 1-2)
1. Complete wallet-first auth migration (run production DB migration)
2. Set up error tracking (Sentry)
3. Add basic unit tests for scoring engine
4. Update README with actual project documentation

### P1 - High (Week 3-4)
1. Consolidate rate limiter implementations
2. Add authenticated dashboard pages
3. Implement OG image generation
4. Set up CI/CD pipeline

### P2 - Medium (Month 2)
1. Migrate to Redis caching
2. Add comprehensive API documentation
3. Implement React Query for client-side caching
4. Add E2E tests for critical flows

### P3 - Low (Month 3+)
1. Browser extension development
2. Public API access
3. ML-based rug prediction
4. Webhook notification system

---

## Files Changed Summary

### Files to Create
- `/docs/api/openapi.yaml`
- `/docs/architecture/system-diagram.md`
- `/docs/deployment/vercel-setup.md`
- `/.env.example`
- `/tests/` directory structure
- `/.github/workflows/ci.yml`
- `/components/layout/AuthenticatedLayout.tsx`
- `/app/(authenticated)/dashboard/page.tsx`
- `/app/(authenticated)/settings/page.tsx`
- `/lib/validation/schemas.ts` (Zod schemas)

### Files to Modify
- `README.md` - Replace with project-specific docs
- `lib/rate-limiter.ts` - Consolidate with api-rate-limiter.ts
- `lib/data-fetching.ts` - Break into smaller modules
- `lib/cache.ts` - Add Redis adapter
- `app/(public)/dashboard/page.tsx` - Move to authenticated route
- `package.json` - Add test scripts, clean unused deps

### Files to Remove/Archive
- `frontend-idea/` - Archive or delete
- `lib/supabase.ts` - Remove if not used
- Potentially deprecated scripts in `/scripts`
