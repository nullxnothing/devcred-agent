// Scoring constants
export const SCORE_CONSTANTS = {
  // Token score components (total max: 100)
  MAX_TOKEN_SCORE: 100,
  MIGRATION_MAX: 30,
  TRACTION_MAX: 25,
  HOLDER_RETENTION_MAX: 20,
  DEV_BEHAVIOR_MAX: 15,
  LONGEVITY_MAX: 10,

  // Rug penalty
  RUG_PENALTY: -100,

  // Dev score bounds
  BASE_DEV_SCORE: 500,
  FLOOR_DEV_SCORE: 0,
  MAX_DEV_SCORE: 740,

  // Dev score calculation
  BASE_MULTIPLIER: 5.5, // Scales token avg to 0-550 range
  FIRST_MIGRATION_BONUS: 75, // Big bonus for first successful migration

  // Dev score bonuses per additional migration
  MIGRATION_BONUS: 25, // For 2nd, 3rd, etc.

  // Market cap milestone bonuses
  MCAP_100K_BONUS: 25,
  MCAP_500K_BONUS: 50,
  MCAP_1M_BONUS: 75,
  MCAP_10M_BONUS: 100,

  // Rug penalty for dev score (per rug)
  DEV_RUG_PENALTY: 150,
} as const;

// Tier thresholds
export const TIER_THRESHOLDS = {
  LEGEND: { minScore: 700, minMigrations: 5, minMonths: 6 },
  ELITE: { minScore: 600, minMigrations: 3 },
  RISING_STAR: { minScore: 500, minMcap: 500_000 },
  PROVEN: { minScore: 450, minMigrations: 1 },
  BUILDER: { minScore: 300, minTokens: 3 },
  VERIFIED: { minScore: 150 },
  PENALIZED: { maxScore: 150 },
  UNVERIFIED: {},
} as const;
