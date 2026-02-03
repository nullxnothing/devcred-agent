import { TokenMarketData, MigrationStatus } from '../dexscreener';

export type DevTier = 'legend' | 'elite' | 'rising_star' | 'proven' | 'builder' | 'verified' | 'penalized' | 'unverified';

export interface TokenScoreBreakdown {
  migration: number;      // 0-30
  traction: number;       // 0-25
  holderRetention: number; // 0-20
  devBehavior: number;    // 0-15 (or -100 for rug)
  longevity: number;      // 0-10
  total: number;          // 0-100 (or -100 for rug)
}

export interface TokenScoreInput {
  mintAddress: string;
  creatorWallet: string;
  launchDate: Date;
  isRugged?: boolean;
  rugSeverity?: 'soft' | 'hard' | null;
  communityActive?: boolean;
  bundlePercent?: number;
  // Optional pre-fetched data
  marketData?: TokenMarketData | null;
  migrationStatus?: MigrationStatus;
  holderCount?: number;
  holderCountAtAth?: number;
  devHoldingPercent?: number;
}

export interface DevScoreInput {
  tokens: Array<{
    score: number;
    migrated: boolean;
    launchDate: Date;
    athMarketCap?: number;
    status?: 'active' | 'inactive' | 'rug';
    rugSeverity?: 'soft' | 'hard' | null;
  }>;
  walletCount: number;
  accountCreatedAt: Date;
}

export interface DevScoreResult {
  score: number;
  tier: DevTier;
  breakdown: {
    baseScore: number;
    tokenCount: number;
    migrationCount: number;
    migrationBonus: number;
    marketCapBonus: number;
    tokenScoreBonus: number;
    rugPenalties: number;
    rugCount: number;
    hardRugCount: number;
    accountAgeMonths: number;
    averageTokenScore: number;
  };
}

export interface RugDetectionResult {
  isRug: boolean;
  severity: 'soft' | 'hard' | null;
  sellPercent: number;
  sellTimestampFirst?: number;
  sellTimestampLast?: number;
  totalReceived: number;
  totalSold: number;
}
