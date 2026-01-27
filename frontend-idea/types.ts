export enum UserRole {
  GUEST = 'GUEST',
  VERIFIED_DEV = 'VERIFIED_DEV',
}

export interface TokenLaunch {
  id: string;
  name: string;
  ticker: string;
  launchDate: string;
  score: number; // 0-150
  volume: string;
  status: 'active' | 'rug' | 'inactive';
}

export interface DeveloperProfile {
  id: string;
  handle: string; // Twitter handle or Wallet address
  displayName: string;
  avatarUrl: string;
  isVerified: boolean;
  totalScore: number; // 0-740
  rank: number;
  walletAddress: string;
  joinedDate: string;
  launches: TokenLaunch[];
  tags: string[];
}

export type ViewState = 'HOME' | 'LEADERBOARD' | 'DASHBOARD' | 'PROFILE';
