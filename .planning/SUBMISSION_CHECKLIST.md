# DevCred Hackathon Submission Checklist

**Deadline:** February 12, 2026, 12:00 PM EST
**Agent ID:** 279
**Project ID:** 147
**Current Status:** draft

---

## Pre-Submission Tests

### ✅ Core Functionality (Tested 2026-02-04)
- [x] WebSocket connects to pump.fun (PumpPortal)
- [x] Token creation events detected
- [x] Wallet scanning works (Helius API)
- [x] Database connection works (Railway PostgreSQL)
- [x] Forum API posts successfully (Post #918 created)
- [x] HTTP API serves reputation data

### 🔧 Deployment Verification
- [ ] Railway agent is deployed and running
- [ ] Vercel frontend is deployed
- [ ] API endpoint accessible: `https://devkarmaagent-production.up.railway.app/api/health`
- [ ] Website accessible: `https://devkarma.fun`

---

## Required Submission Items

### Project Details (via API)
```bash
# Check current project status
curl -H "Authorization: Bearer $FORUM_API_KEY" \
  https://agents.colosseum.com/api/my-project
```

Current values:
- **Name:** ✅ DevCred - Real-time Reputation for Pump.fun Deployers
- **Description:** ✅ Complete
- **Repo Link:** ✅ https://github.com/kaelxsol/devcred-agent
- **Solana Integration:** ✅ Documented
- **Tags:** ✅ ai, security, trading

### Missing Items to Add
- [ ] `technicalDemoLink` - Video/screen recording of agent in action
- [ ] `presentationLink` - Slide deck or documentation
- [ ] `twitterHandle` - Project Twitter (optional but recommended)

---

## Final Submission Command

When everything is ready:
```bash
curl -X POST https://agents.colosseum.com/api/my-project/submit \
  -H "Authorization: Bearer $FORUM_API_KEY"
```

---

## Demo Checklist

For judges reviewing the project:

1. **Live Agent Demo**
   - Show Railway logs with real-time token detection
   - Demonstrate wallet scanning for a deployer
   - Show alert posted to forum (if triggered)

2. **Extension Demo**
   - Install extension in Chrome
   - Navigate to axiom.trade token page
   - Show DevKarma badge injected with score

3. **API Demo**
   - Query reputation endpoint
   - Show cached vs fresh scan response

---

## Environment Variables Required

### Railway (Agent)
- `DATABASE_URL` ✅
- `HELIUS_API_KEY` ✅
- `FORUM_API_KEY` ✅

### Vercel (Frontend)
- `DATABASE_URL` ✅
- `HELIUS_API_KEY` ✅
- `NEXTAUTH_SECRET` ✅
- `NEXTAUTH_URL` ✅

---

## Known Issues / Tech Debt

1. **Extension memory** - scoreCache grows indefinitely (low priority)
2. **SSL warning** - Railway uses self-signed certs (documented, acceptable)
3. **Rate limiting** - Added to agent server (60 req/min)

---

## Post-Submission

- [ ] Monitor agent uptime during judging period
- [ ] Watch for forum activity / judge questions
- [ ] Keep Railway and Vercel logs accessible
