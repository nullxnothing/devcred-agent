# Scoring System

The scoring system is defined in `lib/scoring.ts`. It evaluates both individual tokens and overall developer reputation.

## Token Score (0-100, or -100 for rug)

Each token a developer has created is scored across 5 dimensions:

| Component | Max Points | Criteria |
|-----------|------------|----------|
| **Migration** | 30 | Token successfully migrated to DEX (Raydium/Orca/Meteora) |
| **Traction** | 25 | ATH market cap achieved |
| **Holder Retention** | 20 | Number of unique holders |
| **Dev Behavior** | 15 | How much of supply dev still holds (less is better) |
| **Longevity** | 10 | How long the token has been alive |
| **Rug Penalty** | -100 | If rug detected, entire score becomes -100 |

### Traction Thresholds (ATH Market Cap)

| Market Cap | Points |
|------------|--------|
| $10M+ | 25 |
| $1M+ | 22 |
| $500K+ | 18 |
| $100K+ | 14 |
| $50K+ | 10 |
| $20K+ | 6 |
| $10K+ | 3 |

### Holder Retention Thresholds

| Holders | Points |
|---------|--------|
| 5,000+ | 20 |
| 1,000+ | 15 |
| 500+ | 10 |
| 100+ | 5 |
| 50+ | 2 |

### Dev Behavior (Holdings %)

| Dev Holding % | Points |
|---------------|--------|
| 50%+ | 0 (suspicious) |
| 20-49% | 5 |
| 5-19% | 10 |
| 1-4% | 15 (well distributed) |
| 0% | 10 (neutral) |

### Longevity

| Age | Points |
|-----|--------|
| 90+ days | 10 |
| 30+ days | 7 |
| 7+ days | 4 |
| 1+ day | 1 |

---

## Dev Score (0-740)

The overall developer score is calculated from all their tokens:

```
Dev Score = (Weighted Token Average × 5.5) + Migration Bonuses + Market Cap Bonuses - Rug Penalties
```

### Score Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BASE_MULTIPLIER` | 5.5 | Scales weighted average to 0-550 range |
| `FIRST_MIGRATION_BONUS` | 75 | Bonus for first successful migration |
| `MIGRATION_BONUS` | 25 | Bonus for each additional migration |
| `MCAP_100K_BONUS` | 25 | Per token that hit $100K ATH |
| `MCAP_500K_BONUS` | 50 | Per token that hit $500K ATH |
| `MCAP_1M_BONUS` | 75 | Per token that hit $1M ATH |
| `MCAP_10M_BONUS` | 100 | Per token that hit $10M ATH |
| `DEV_RUG_PENALTY` | 150 | Deducted per rugged token |

### Weighted Average Calculation

Better-performing tokens get more weight in the calculation:

```javascript
weight = Math.max(1, tokenScore / 10)
weightedSum += tokenScore × weight
```

---

## Dev Tiers

Tiers are assigned based on score AND additional criteria:

| Tier | Score | Additional Requirements | Color |
|------|-------|------------------------|-------|
| **Legend** | 700+ | 5+ migrations, 6+ months active | 🟡 Gold (#FFD700) |
| **Elite** | 600+ | 3+ migrations | 🟣 Purple (#9B59B6) |
| **Rising Star** | 500+ | At least one $500K+ ATH launch | 🟠 Amber (#F59E0B) |
| **Proven** | 450+ | 1+ migration | 🟢 Green (#27AE60) |
| **Builder** | 300+ | 3+ tokens launched | 🔵 Blue (#3498DB) |
| **Verified** | 150+ | Wallet verified | ⚪ Gray (#95A5A6) |
| **Penalized** | <150 | Has rug history | 🔴 Dark Red (#8B0000) |
| **Unverified** | - | No verified wallets | ⚪ Light Gray (#BDC3C7) |

---

## Score Colors (UI)

Defined in `lib/score-colors.ts`. Used for displaying scores with appropriate colors.

### Dev Score Colors (0-740 scale)

| Score Range | Level | Hex Color |
|-------------|-------|-----------|
| 700+ | Legend | #D4AF37 (Gold) |
| 600-699 | Elite | #A78BFA (Purple) |
| 500-599 | Proven | #4ADE80 (Green) |
| 350-499 | Builder | #3B82F6 (Blue) |
| 200-349 | Verified | #6B7280 (Gray) |
| 100-199 | Low | #F97316 (Orange) |
| 0-99 | Danger | #DC2626 (Red) |
| <0 | Negative | #F87171 (Light Red) |

### Token Score Colors (0-100 scale)

| Score Range | Level | Hex Color |
|-------------|-------|-----------|
| 95+ | Legend | #D4AF37 |
| 85-94 | Elite | #A78BFA |
| 70-84 | Proven | #4ADE80 |
| 55-69 | Builder | #3B82F6 |
| 40-54 | Verified | #6B7280 |
| 20-39 | Low | #F97316 |
| 0-19 | Danger | #DC2626 |
| <0 | Negative | #F87171 |

---

## Related Files

- `lib/scoring.ts` - Main scoring logic
- `lib/score-colors.ts` - UI color utilities
- `lib/scoring/` - Additional scoring modules
