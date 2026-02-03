/**
 * PumpPortal WebSocket event types
 */

export interface PumpPortalTokenEvent {
  signature: string;
  mint: string;
  traderPublicKey: string; // deployer wallet
  txType: 'create' | 'buy' | 'sell';
  initialBuy?: number;
  bondingCurveKey?: string;
  vTokensInBondingCurve?: number;
  vSolInBondingCurve?: number;
  marketCapSol?: number;
  name?: string;
  symbol?: string;
  uri?: string;
}

export interface PumpPortalMigrationEvent {
  signature: string;
  mint: string;
  pool?: string;
}

export interface AgentScanRecord {
  wallet: string;
  lastScanned: Date;
  scanCount: number;
  totalScore: number;
  tier: string;
  tokenCount: number;
  rugCount: number;
  migrationCount: number;
}

export interface QueuedWallet {
  address: string;
  tokenMint: string;
  tokenName?: string;
  tokenSymbol?: string;
  queuedAt: Date;
  priority: number; // Higher = process sooner
}

export interface ForumPost {
  title: string;
  body: string;
  tags: string[];
}

export type AlertType =
  | 'high_risk_deployer'    // 3+ rugs
  | 'new_deployer'          // First token launch
  | 'reputable_deployer'    // Legend/Elite tier
  | 'serial_launcher';      // 10+ tokens in 24h
