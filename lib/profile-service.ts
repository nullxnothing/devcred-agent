/**
 * Profile Service - Refactored from data-fetching.ts
 * Breaks down the monolithic getProfileData into focused, testable functions
 */

import { User, Wallet, Token } from '@/types/database';
import { DEX_CONFIG, MigrationDexType } from './constants';
import { TokenMarketData } from './dexscreener';

// ==================== TYPES ====================

export interface TokenDisplayData {
  mint: string;
  name: string;
  symbol: string;
  launchDate: string;
  migrated: boolean;
  marketCap: number | null;
  volume24h: number | null;
  totalVolume: number | null;
  status: string;
  score: number;
  athMarketCap?: number | null;
  rugSeverity?: 'soft' | 'hard' | null;
  creationVerified?: boolean;
}

export interface TokenMetadata {
  rug_severity?: 'soft' | 'hard' | null;
  creation_verified?: boolean;
  creation_signature?: string;
  creation_method?: string;
  dev_sell_percent?: number;
}

// ==================== TOKEN MAPPING ====================

/** Map database token to display format (for fresh scans without market data) */
export function mapTokenToDisplayData(token: Token): TokenDisplayData {
  const metadata = token.metadata as TokenMetadata | null;

  return {
    mint: token.mint_address,
    name: token.name,
    symbol: token.symbol,
    launchDate: token.launch_date,
    migrated: token.migrated,
    marketCap: token.current_market_cap,
    volume24h: null,
    totalVolume: token.total_volume,
    status: token.status,
    score: token.score || (token.migrated ? 50 : 10),
    athMarketCap: token.ath_market_cap,
    rugSeverity: metadata?.rug_severity,
    creationVerified: metadata?.creation_verified,
  };
}

/** Map token with enriched market data */
export function mapTokenWithMarketData(
  token: Token,
  marketData: TokenMarketData | null,
  calculatedScore: number
): TokenDisplayData {
  const metadata = token.metadata as TokenMetadata | null;

  const migrated = marketData?.dexId
    ? (DEX_CONFIG.MIGRATION_DEX_IDS as readonly string[]).includes(marketData.dexId.toLowerCase())
    : token.migrated;

  return {
    mint: token.mint_address,
    name: token.name,
    symbol: token.symbol,
    launchDate: token.launch_date,
    migrated,
    marketCap: marketData?.marketCap || token.current_market_cap,
    volume24h: marketData?.volume24h || null,
    totalVolume: token.total_volume,
    status: token.status,
    score: calculatedScore,
    athMarketCap: token.ath_market_cap || marketData?.marketCap,
    rugSeverity: metadata?.rug_severity,
    creationVerified: metadata?.creation_verified,
  };
}

// ==================== MIGRATION STATUS ====================

/** Derive migration status from market data */
export function deriveMigrationStatus(
  token: Token,
  marketData: TokenMarketData | null
): {
  migrated: boolean;
  migrationType: MigrationDexType | null;
  pool: null;
  liquidityUsd: number;
  migratedAt: Date | null;
} {
  if (marketData?.dexId) {
    const dexId = marketData.dexId.toLowerCase();
    const isMigrated = (DEX_CONFIG.MIGRATION_DEX_IDS as readonly string[]).includes(dexId);

    if (isMigrated) {
      return {
        migrated: true,
        migrationType: dexId as MigrationDexType,
        pool: null,
        liquidityUsd: marketData.liquidity || 0,
        migratedAt: marketData.pairCreatedAt,
      };
    }
  }

  return {
    migrated: token.migrated,
    migrationType: null,
    pool: null,
    liquidityUsd: 0,
    migratedAt: token.migrated_at ? new Date(token.migrated_at) : null,
  };
}

// ==================== WALLET HELPERS ====================

/** Get primary wallet from wallet list */
export function getPrimaryWallet(wallets: Wallet[]): Wallet | null {
  if (wallets.length === 0) return null;
  return wallets.find(w => w.is_primary) || wallets[0];
}

// ==================== VALIDATION ====================

/** Check if a string is a valid Solana address format */
export function isValidSolanaAddress(address: string): boolean {
  return address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
}

/** Clean Twitter handle (remove @ prefix) */
export function cleanTwitterHandle(handle: string): string {
  return handle.replace(/^@/, '');
}

// ==================== STATS CALCULATION ====================

/** Calculate profile statistics from token data */
export function calculateProfileStats(
  tokens: TokenDisplayData[],
  migrationCount: number,
  avgTokenScore: number,
  rugCount: number
): {
  totalTokens: number;
  migratedTokens: number;
  avgTokenScore: number;
  rugCount: number;
} {
  return {
    totalTokens: tokens.length,
    migratedTokens: migrationCount,
    avgTokenScore,
    rugCount,
  };
}

// ==================== ERROR HANDLING ====================

/** Default rug detection result for error cases */
export const DEFAULT_RUG_DETECTION = {
  isRug: false,
  severity: null as 'soft' | 'hard' | null,
  sellPercent: 0,
  totalReceived: 0,
  totalSold: 0,
};

/** Safely execute rug detection with fallback */
export async function safeRugDetection<T>(
  detectFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await detectFn();
  } catch (error) {
    console.warn('Rug detection failed:', error);
    return fallback;
  }
}
