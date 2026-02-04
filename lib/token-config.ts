export const TOKEN_CONFIG = {
  name: 'DevKarma',
  symbol: 'KARMA',
  contractAddress: 'Coming Soon',
  totalSupply: '1B',
  links: {
    dexscreener: '#',
    pump: '#',
    raydium: '#',
  },
};

export const AIRDROP_CRITERIA = [
  {
    id: 'leaderboard',
    title: 'Top Builders',
    description: 'Top 100 on the DevCred leaderboard at snapshot',
    icon: 'Trophy',
  },
  {
    id: 'early-adopters',
    title: 'Early Adopters',
    description: 'Claimed profile before token launch',
    icon: 'Clock',
  },
  {
    id: 'holders',
    title: 'Token Holders',
    description: 'Hold $KARMA tokens in your wallet',
    icon: 'Coins',
  },
  {
    id: 'contributors',
    title: 'Community Contributors',
    description: 'Active in community discussions (TBD)',
    icon: 'Users',
  },
];

export const GATED_FEATURES = [
  {
    id: 'priority-scan',
    title: 'Priority Scanning',
    description: 'Skip the queue with instant wallet analysis',
    icon: 'Zap',
    tier: 'basic',
  },
  {
    id: 'unlimited-api',
    title: 'Unlimited API',
    description: 'No rate limits on reputation lookups',
    icon: 'Infinity',
    tier: 'basic',
  },
  {
    id: 'custom-badges',
    title: 'Custom Badges',
    description: 'Exclusive profile themes and badges',
    icon: 'Award',
    tier: 'premium',
  },
  {
    id: 'analytics',
    title: 'Analytics Dashboard',
    description: 'Deep dive into your reputation metrics',
    icon: 'BarChart3',
    tier: 'premium',
  },
];

export const INFRASTRUCTURE_COSTS = [
  {
    title: 'Token Discovery',
    description: 'Scanning wallets for created tokens via DAS API',
  },
  {
    title: 'Holder Analysis',
    description: 'Tracking holder counts and retention metrics',
  },
  {
    title: 'Migration Detection',
    description: 'Checking DEX listings on Raydium, Orca, Meteora',
  },
  {
    title: 'Transaction History',
    description: 'Full launch timeline and dev behavior analysis',
  },
  {
    title: 'Real-time Monitoring',
    description: 'pump.fun WebSocket for instant new token alerts',
  },
];
