# DevKarma — Production Preparation Plan

## Overview

DevKarma is a **developer reputation platform for Solana token creators**, calculating "credit scores" (0-740) based on on-chain launch history. The system distinguishes between "fizzled" tokens (low traction) and "rugged" tokens (dev dumped on holders).

**Major Components:**
- **Next.js 16 App** (App Router) — Frontend + API routes (deployed to Vercel)
- **Background Agent** — Pump.fun monitor + HTTP API (deployed to Railway)
- **PostgreSQL Database** — Railway-hosted with `dk_` prefixed tables
- **Chrome Extension** — Axiom data scraper for wallet reputation

**Current State:** Development complete, dual deployment (Vercel + Railway) functional, lacking production hardening.

---

## 1. Environment & Configuration Security

### Environment Variables Audit
- [ ] **Create `.env.example` file** — Document all required variables without secrets
- [ ] **Audit env var usage** — Ensure no secrets logged or exposed to client
- [ ] **Remove hardcoded fallbacks** — Remove fallback connection strings in scripts (e.g., `wipe-db.ts` line 5)
- [ ] **Add JWT_SECRET as required** — Currently falls back to `NEXTAUTH_SECRET`, should be explicit
- [ ] **Validate env vars at startup** — Add runtime validation in `lib/config.ts`
- [ ] **Separate Railway vs Vercel env vars** — Document which vars needed where

### Secret Management
- [ ] **Rotate all API keys** — Fresh keys for production (Helius, Twitter OAuth)
- [ ] **Regenerate NEXTAUTH_SECRET** — Use cryptographically secure 32+ byte string
- [ ] **Audit Railway environment** — Ensure production secrets not shared with previews
- [ ] **Audit Vercel environment** — Separate preview/production environment variables

---

## 2. Database Production Readiness

### Schema & Migrations
- [ ] **Consolidate migrations** — 8 migrations exist; consider squashing for fresh prod deploy
- [ ] **Add migration versioning strategy** — Document how to apply migrations to production
- [ ] **Create production seed script** — Separate from development seeding
- [ ] **Add database backup strategy** — Railway automated backups + manual export procedure
- [ ] **Create rollback procedures** — Document how to revert bad migrations

### Performance Optimization
- [ ] **Review existing indexes** — Validate indexes cover common query patterns
- [ ] **Add composite indexes** — For `dk_tokens(creator_wallet, launch_date)` queries
- [ ] **Add connection pooling** — Verify PgBouncer or similar for Railway PostgreSQL
- [ ] **Optimize pool settings** — Current `max: 20` may need tuning for production load
- [ ] **Add query performance monitoring** — Log slow queries (>100ms)

### Data Integrity
- [ ] **Add database constraints** — Validate NOT NULL, CHECK constraints on critical columns
- [ ] **Add score range constraints** — Ensure `total_score` stays 0-740
- [ ] **Add wallet address validation** — PostgreSQL CHECK for valid Solana address format
- [ ] **Create data validation job** — Periodic script to detect/fix corrupted scores

---

## 3. API Security Hardening

### Authentication & Authorization
- [ ] **Add middleware.ts** — Currently missing; add for auth protection on sensitive routes
- [ ] **Audit API route protection** — Ensure `/api/wallet/*`, `/api/user/*` require auth
- [ ] **Add CORS configuration** — Restrict API access to known origins
- [ ] **Implement CSRF protection** — For state-changing operations
- [ ] **Add request signing for agent API** — Railway agent calls need authentication

### Rate Limiting
- [ ] **Replace in-memory rate limiter** — Current `api-rate-limiter.ts` won't work multi-instance
- [ ] **Add Redis for rate limiting** — Required for Vercel edge + Railway scaling
- [ ] **Add rate limit headers** — `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- [ ] **Configure per-endpoint limits** — Tighter limits on expensive operations (wallet sync)
- [ ] **Add IP-based limits** — Prevent unauthenticated abuse

### Input Validation
- [ ] **Add Zod schemas for all endpoints** — Some routes lack proper validation
- [ ] **Sanitize user inputs** — Prevent XSS in Twitter bio/name fields
- [ ] **Validate wallet addresses server-side** — Before any blockchain API calls
- [ ] **Add request body size limits** — Prevent large payload attacks

---

## 4. Caching Layer Production Upgrade

### Redis Integration
- [ ] **Add Redis service** — Railway Redis addon or Upstash for serverless
- [ ] **Migrate in-memory caches** — Replace `Map` caches in `lib/cache.ts`
- [ ] **Configure Redis connection pooling** — Handle connection limits
- [ ] **Add Redis health check** — Include in `/api/health` endpoint

### Cache Strategy
- [ ] **Implement cache warming** — Pre-populate leaderboard on deploy
- [ ] **Add cache invalidation webhooks** — For score updates
- [ ] **Configure TTLs by data type** — Market data (5m), holder counts (30m), scores (1h)
- [ ] **Add cache bypass for admin** — Debug cache issues in production

---

## 5. Error Handling & Logging

### Error Tracking
- [ ] **Integrate Sentry** — Add `@sentry/nextjs` for error tracking
- [ ] **Configure source maps** — Upload to Sentry for stack traces
- [ ] **Add error boundaries** — Already have `ErrorBoundary.tsx`, verify coverage
- [ ] **Filter sensitive data** — Scrub wallet addresses from Sentry if needed
- [ ] **Set up Sentry alerts** — Notify on new errors, error spikes

### Logging Infrastructure
- [ ] **Add structured logging** — Replace `console.log` with structured logger (Pino)
- [ ] **Audit console.log usage** — 100+ instances found; convert to proper logging
- [ ] **Add request ID tracking** — Correlate logs across request lifecycle
- [ ] **Configure log levels** — Debug off in production, info/warn/error only
- [ ] **Add log aggregation** — Railway logs, consider Axiom or Logtail

### Health Checks
- [ ] **Enhance `/api/health`** — Add database, Redis, Helius connectivity checks
- [ ] **Add agent health endpoint** — Monitor Railway agent separately
- [ ] **Configure Railway health checks** — Enable in `nixpacks.toml`
- [ ] **Add liveness vs readiness probes** — Distinguish startup from runtime health

---

## 6. Performance Optimization

### Frontend Performance
- [ ] **Audit bundle size** — Check `@solana/web3.js` impact (~500KB)
- [ ] **Add dynamic imports** — Lazy load wallet adapter on connect
- [ ] **Optimize images** — Verify Next.js Image optimization for Twitter avatars
- [ ] **Add loading skeletons** — Replace spinners with skeleton UI
- [ ] **Enable React Compiler** — Next.js 16 support for automatic memoization

### API Performance
- [ ] **Add response compression** — Gzip/Brotli for JSON responses
- [ ] **Optimize database queries** — Audit N+1 queries in profile endpoints
- [ ] **Add query result limits** — Paginate all list endpoints
- [ ] **Implement batch endpoints** — For leaderboard + multiple wallet lookups

### Third-Party API Optimization
- [ ] **Add Helius request batching** — Combine `getAssetBatch` calls
- [ ] **Implement request deduplication** — Prevent duplicate in-flight requests
- [ ] **Add circuit breaker** — Handle Helius/DexScreener outages gracefully
- [ ] **Cache DexScreener responses** — Market data rarely changes per-minute

---

## 7. Testing Infrastructure

### Unit Testing
- [ ] **Add testing framework** — Vitest or Jest setup
- [ ] **Test scoring algorithms** — Cover edge cases in `lib/scoring.ts`
- [ ] **Test wallet validation** — Cover all address formats
- [ ] **Test tier calculations** — Verify score-to-tier mappings
- [ ] **Add coverage thresholds** — Enforce minimum 70% coverage

### Integration Testing
- [ ] **Add database tests** — Test against test database
- [ ] **Mock Helius/DexScreener** — Prevent API calls in tests
- [ ] **Test auth flows** — Twitter OAuth + wallet signature verification
- [ ] **Test rate limiting** — Verify limits work correctly

### End-to-End Testing
- [ ] **Add Playwright tests** — Already in devDependencies, needs test files
- [ ] **Test critical flows** — Wallet connect, profile view, leaderboard
- [ ] **Add visual regression** — Screenshot comparison for UI changes
- [ ] **Test extension functionality** — Axiom scraping flow

---

## 8. Deployment Pipeline

### CI/CD Setup
- [ ] **Add GitHub Actions workflow** — Build, lint, test on PR
- [ ] **Add type checking to CI** — `tsc --noEmit` in pipeline
- [ ] **Add lint enforcement** — Fail on lint errors
- [ ] **Add PR preview deployments** — Vercel automatic previews
- [ ] **Protect main branch** — Require PR reviews + passing checks

### Build Optimization
- [ ] **Verify production build** — `npm run build` succeeds without warnings
- [ ] **Audit build output** — Check for oversized chunks
- [ ] **Configure standalone output** — For containerized Railway deploy
- [ ] **Add build cache** — Speed up Railway/Vercel builds

### Deployment Strategy
- [ ] **Document deployment order** — Database migrations → Agent → Frontend
- [ ] **Add deployment scripts** — Automate Railway + Vercel deploys
- [ ] **Configure rollback procedures** — One-click rollback on failure
- [ ] **Add deployment notifications** — Slack/Discord webhook on deploy

---

## 9. Monitoring & Observability

### Uptime Monitoring
- [ ] **Set up UptimeRobot/Checkly** — Monitor `/api/health` endpoint
- [ ] **Monitor Railway agent** — Separate uptime check for agent API
- [ ] **Configure alerting** — PagerDuty/Slack notifications on downtime
- [ ] **Add status page** — Public status page for users

### Performance Monitoring
- [ ] **Add Vercel Analytics** — Built-in performance insights
- [ ] **Monitor Core Web Vitals** — LCP, FID, CLS tracking
- [ ] **Add custom metrics** — Score calculation times, API latencies
- [ ] **Set performance budgets** — Alert on regression

### Business Metrics
- [ ] **Track wallet connections** — Daily active wallets
- [ ] **Track profile views** — Already have `dk_profile_views` table
- [ ] **Track leaderboard usage** — Page views, search queries
- [ ] **Track extension installs** — Chrome Web Store metrics

---

## 10. Security Audit

### Code Security
- [ ] **Run `npm audit`** — Fix vulnerable dependencies
- [ ] **Review auth implementation** — Audit `lib/auth.ts` for vulnerabilities
- [ ] **Review wallet verification** — Audit `lib/wallet-auth.ts` signature validation
- [ ] **Audit SQL queries** — Verify no SQL injection (using parameterized queries)
- [ ] **Check for secrets in code** — Scan for hardcoded credentials

### Infrastructure Security
- [ ] **Enable Railway private networking** — If needed for agent ↔ database
- [ ] **Review database access** — Verify only Railway agent + Vercel can connect
- [ ] **Add SSL enforcement** — Ensure database connections use SSL
- [ ] **Enable Vercel protection** — Password protect preview deployments

### Compliance
- [ ] **Add privacy policy** — Document data collection
- [ ] **Add terms of service** — User agreement
- [ ] **Implement data export** — GDPR/CCPA compliance
- [ ] **Add data deletion** — User can delete their profile

---

## 11. Documentation

### Developer Documentation
- [ ] **Update README.md** — Production deployment instructions
- [ ] **Update SETUP_GUIDE.md** — Remove outdated Supabase references
- [ ] **Document API endpoints** — OpenAPI/Swagger specification
- [ ] **Document scoring algorithm** — Public explanation of score calculation
- [ ] **Add architecture diagram** — Visual system overview

### Operational Documentation
- [ ] **Create runbook** — Common issues and resolutions
- [ ] **Document on-call procedures** — Escalation paths
- [ ] **Add incident response plan** — Steps for production issues
- [ ] **Document backup/restore** — Database recovery procedures

---

## 12. Pre-Launch Checklist

### Final Verification
- [ ] **Test production environment** — Full flow on production domains
- [ ] **Verify Twitter OAuth** — Production callback URLs configured
- [ ] **Test wallet signatures** — Phantom/Solflare on production
- [ ] **Verify Helius API** — Production key working
- [ ] **Load test critical endpoints** — Profile, leaderboard, search

### Launch Preparation
- [ ] **Set up production domain** — devkarma.xyz or similar
- [ ] **Configure DNS** — Vercel custom domain
- [ ] **Enable analytics** — Google Analytics or Plausible
- [ ] **Prepare launch announcement** — Twitter thread, Discord announcement
- [ ] **Create support channels** — Discord server or Twitter DMs

### Rollback Plan
- [ ] **Document rollback steps** — How to revert to previous version
- [ ] **Test rollback procedure** — Practice before launch
- [ ] **Keep previous version available** — Don't delete old deployments
- [ ] **Prepare communication template** — User notification if rollback needed

---

## Priority Order for Production Launch

### Phase 1: Critical (Before any production traffic)
1. Environment variable security audit
2. Add middleware.ts for route protection
3. Integrate Sentry for error tracking
4. Enhance health checks
5. Set up uptime monitoring

### Phase 2: High Priority (First week)
1. Replace in-memory caches with Redis
2. Add structured logging
3. Set up CI/CD pipeline
4. Add database backup strategy
5. Production security audit

### Phase 3: Important (First month)
1. Add testing infrastructure
2. Implement comprehensive monitoring
3. Performance optimization
4. Documentation updates
5. Compliance requirements

### Phase 4: Ongoing
1. Regular dependency updates
2. Performance monitoring and optimization
3. Feature development
4. User feedback integration
