/**
 * Centralized constants for DevCred
 * Eliminates magic numbers scattered across modules
 */

// ==================== API LIMITS ====================
export const API_LIMITS = {
  HELIUS_RPS: 10,
  DEXSCREENER_PER_MINUTE: 300,
  GECKO_PER_MINUTE: 30,
  HELIUS_BATCH_SIZE: 1000,
  DEXSCREENER_BATCH_SIZE: 30,
} as const;

// ==================== PAGINATION ====================
export const PAGINATION = {
  DEFAULT_PAGE_LIMIT: 1000,
  MAX_PAGES: 20,
  MAX_TX_TO_SCAN: 1000,
  CONCURRENCY_LOW: 5,
  CONCURRENCY_HIGH: 10,
} as const;

// ==================== CACHE ====================
export const CACHE = {
  TTL_MS: 5 * 60 * 1000, // 5 minutes
} as const;

// ==================== SOLANA PROGRAMS ====================
export const SOLANA_PROGRAMS = {
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
} as const;

// System tokens to exclude from detection
export const SYSTEM_TOKEN_MINTS = new Set([
  'So11111111111111111111111111111111111111112', // Wrapped SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
]);

// ==================== DEX CONFIGURATION ====================
export const DEX_CONFIG = {
  // DEX sources indicating migration from pump.fun bonding curve
  // PUMPSWAP is pump.fun's post-graduation AMM (launched Jan 2025) - IS a migration
  MIGRATION_DEX_SOURCES: new Set([
    'RAYDIUM',
    'ORCA',
    'JUPITER',
    'METEORA',
    'LIFINITY',
    'PUMPSWAP',  // Post-graduation AMM
    'ALDRIN',
    'CROPPER',
    'SABER',
    'SERUM',
    'MERCURIAL',
    'WHIRLPOOL',
  ]),

  // Sources to exclude from migration detection (bonding curve trades)
  NON_MIGRATION_SOURCES: new Set([
    'PUMP',
    'PUMPFUN',
    'PUMP_FUN',
    'PUMP.FUN',
    'UNKNOWN',
    '',
  ]),

  // DEX IDs for graduated/migrated tokens (NOT pump.fun bonding curve)
  // pumpswap is pump.fun's post-graduation AMM (launched Jan 2025)
  MIGRATION_DEX_IDS: ['raydium', 'orca', 'meteora', 'pumpswap', 'jupiter', 'lifinity', 'whirlpool'] as const,

  MINIMUM_LIQUIDITY_FOR_MIGRATION: 10000, // $10K USD
} as const;

export type MigrationDexType = typeof DEX_CONFIG.MIGRATION_DEX_IDS[number];

// ==================== RUG DETECTION ====================
export const RUG_DETECTION = {
  HOURS_24: 24 * 60 * 60,
  HOURS_48: 48 * 60 * 60,
  HARD_RUG_SELL_THRESHOLD: 90,
  SOFT_RUG_SELL_THRESHOLD: 80,
  EXTREME_RUG_THRESHOLD: 95,
} as const;

// ==================== SCORING ====================
export const SCORING = {
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

  // Dev score bonuses per token
  MIGRATION_BONUS: 30,
  MCAP_100K_BONUS: 20,
  MCAP_500K_BONUS: 30,
  MCAP_1M_BONUS: 40,
  MCAP_10M_BONUS: 50,

  // Rug penalty for dev score (per rug)
  DEV_RUG_PENALTY: 150,
} as const;

// Market cap thresholds
export const MARKET_CAP_THRESHOLDS = {
  TIER_1: 10_000,    // $10K
  TIER_2: 50_000,    // $50K
  TIER_3: 100_000,   // $100K
  TIER_4: 500_000,   // $500K
  TIER_5: 1_000_000, // $1M
  TIER_6: 10_000_000, // $10M
} as const;

// Holder count thresholds
export const HOLDER_THRESHOLDS = {
  TIER_1: 50,
  TIER_2: 100,
  TIER_3: 500,
  TIER_4: 1000,
  TIER_5: 5000,
} as const;

// Longevity thresholds (days)
export const LONGEVITY_THRESHOLDS = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  QUARTER: 90,
} as const;

// ==================== TIER THRESHOLDS ====================
export const TIER_THRESHOLDS = {
  LEGEND: { minScore: 700, minMigrations: 5, minMonths: 6 },
  ELITE: { minScore: 600, minMigrations: 3 },
  PROVEN: { minScore: 450, minMigrations: 1 },
  BUILDER: { minScore: 300, minTokens: 3 },
  VERIFIED: { minScore: 150 },
  PENALIZED: { maxScore: 150 },
  UNVERIFIED: {},
} as const;

// ==================== HELPER FUNCTIONS ====================

/** Normalize DEX ID to migration type */
export function normalizeDexId(dexId: string): MigrationDexType | null {
  const normalized = dexId.toLowerCase();
  if (DEX_CONFIG.MIGRATION_DEX_IDS.includes(normalized as MigrationDexType)) {
    return normalized as MigrationDexType;
  }
  return null;
}

/** Check if source indicates migration */
export function isMigrationSource(source: string): boolean {
  const upper = source.toUpperCase();
  return DEX_CONFIG.MIGRATION_DEX_SOURCES.has(upper) &&
         !DEX_CONFIG.NON_MIGRATION_SOURCES.has(upper);
}
