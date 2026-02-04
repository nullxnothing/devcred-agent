export interface HeliusAsset {
  id: string;
  interface?: string; // e.g., 'FungibleToken', 'FungibleAsset', 'V1_NFT', 'ProgrammableNFT'
  content: {
    metadata: {
      name: string;
      symbol: string;
    };
    json_uri?: string;
  };
  token_info?: {
    supply: number;
    decimals: number;
    price_info?: {
      price_per_token: number;
      total_price: number;
    };
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
  ownership?: {
    owner: string;
  };
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface HeliusTokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  frozen: boolean;
}

export interface HeliusTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  fee: number;
  feePayer: string;
  source?: string;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard: string;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

export interface TokenCreated {
  mintAddress: string;
  name: string;
  symbol: string;
  creatorAddress: string;
  supply: number;
  decimals: number;
  pricePerToken?: number;
  creationSignature?: string;
  creationTimestamp?: number;
  creationVerified?: boolean;
}

export interface CreatorVerification {
  isCreator: boolean;
  creationSignature?: string;
  creationTimestamp?: number;
  feePayer?: string;
}

export interface TokenHolder {
  ownerAddress: string;
  tokenAccount: string;
  amount: number;
}

export interface WalletTransaction {
  signature: string;
  timestamp: number;
  type: string;
  description: string;
  fee: number;
  tokenTransfers: Array<{
    from: string;
    to: string;
    mint: string;
    amount: number;
  }>;
}

export interface TransactionsForAddressResult {
  data: TransactionForAddress[];
  nextCursor?: string;
}

export interface TransactionForAddress {
  signature: string;
  timestamp: number;
  slot: number;
  fee: number;
  feePayer: string;
  description?: string;
  type?: string;
  source?: string;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
    tokenStandard?: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
    }>;
  }>;
}

export interface MigratedTokenInfo {
  mintAddress: string;
  dexSource: string;
  firstSwapTimestamp: number;
  swapCount: number;
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
