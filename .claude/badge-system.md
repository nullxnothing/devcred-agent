# Badge System

Badges are achievement markers displayed on profile "calling cards". Defined in `lib/badges.ts`.

## Badge Types

### ATH Market Cap Badges

| Badge | Threshold | Tier | Icon |
|-------|-----------|------|------|
| `ath_10k` | $10,000 | Bronze | Coins |
| `ath_50k` | $50,000 | Silver | TrendingUp |
| `ath_100k` | $100,000 | Gold | Rocket |
| `ath_500k` | $500,000 | Platinum | Flame |
| `ath_1m` | $1,000,000 | Diamond | Gem |
| `ath_10m` | $10,000,000 | Diamond | Crown |

### Holder Count Badges

| Badge | Threshold | Tier | Icon |
|-------|-----------|------|------|
| `holders_100` | 100 holders | Bronze | Users |
| `holders_500` | 500 holders | Silver | Users |
| `holders_1k` | 1,000 holders | Gold | Users |
| `holders_5k` | 5,000 holders | Platinum | Users |

### Migration Badges

| Badge | Criteria | Tier | Icon |
|-------|----------|------|------|
| `migrated` | Token migrated to DEX | Silver | Plane |
| `first_migration` | First successful migration | Gold | Award |

### Launch Quality Badges

| Badge | Criteria | Tier | Icon |
|-------|----------|------|------|
| `strong_launch` | Token score 75+ | Silver | Zap |
| `elite_launch` | Token score 90+ | Gold | Trophy |

### Special Badges

| Badge | Criteria | Tier | Icon |
|-------|----------|------|------|
| `diamond_hands` | Dev held through volatility | Platinum | Diamond |
| `multi_launcher` | 5+ successful tokens | Gold | Layers |

---

## Badge Tiers & Styling

| Tier | Gradient Colors | Shadow | Text Color |
|------|-----------------|--------|------------|
| **Bronze** | Amber 700 → 600 → 700 | Amber glow | amber-100 |
| **Silver** | Slate 400 → 300 → 400 | Gray glow | slate-900 |
| **Gold** | Yellow 600 → 400 → 600 | Yellow glow | yellow-900 |
| **Platinum** | Cyan 400 → Teal 300 → Cyan 400 | Teal glow | teal-900 |
| **Diamond** | Purple 500 → Pink 400 → Purple 500 | Pink glow | white |

---

## Badge Calculation Logic

Badges are calculated per-token and aggregated for the developer profile.

### ATH Badge Selection
- Only the **highest** ATH badge is awarded per token
- If a token hit $500K, it gets `ath_500k`, not all lower badges

### Holder Badge Selection
- Only the **highest** holder badge is awarded per token
- Based on peak holder count

### Migration Badges
- `first_migration` awarded once (first ever)
- `migrated` awarded for each subsequent migration

### Launch Quality
- Based on final token score (0-100)
- `strong_launch`: score ≥ 75
- `elite_launch`: score ≥ 90

---

## Badge Data Structure

```typescript
interface Badge {
  type: BadgeType;
  tier: BadgeTier;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  tokenMint?: string;
  tokenName?: string;
  tokenSymbol?: string;
  value?: number; // The actual value that earned the badge
  earnedAt?: Date;
}
```

---

## API Endpoint

```
GET /api/profile/{handle}/badges
```

Returns array of badges for a user profile.

---

## Related Files

- `lib/badges.ts` - Badge definitions and calculation logic
- `components/profile/BadgeDisplay.tsx` - UI component for rendering badges
