export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          twitter_id: string | null;
          twitter_handle: string | null;
          twitter_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          total_score: number;
          rank: number | null;
          tier: string | null;
          is_verified: boolean;
          primary_wallet: string | null;
          pumpfun_username: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          twitter_id?: string | null;
          twitter_handle?: string | null;
          twitter_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_score?: number;
          rank?: number | null;
          is_verified?: boolean;
          primary_wallet?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          twitter_id?: string | null;
          twitter_handle?: string | null;
          twitter_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_score?: number;
          rank?: number | null;
          is_verified?: boolean;
          primary_wallet?: string | null;
          pumpfun_username?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          address: string;
          label: string | null;
          is_primary: boolean;
          verified_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          address: string;
          label?: string | null;
          is_primary?: boolean;
          verified_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          address?: string;
          label?: string | null;
          is_primary?: boolean;
          verified_at?: string;
          created_at?: string;
        };
      };
      tokens: {
        Row: {
          id: string;
          mint_address: string;
          name: string;
          symbol: string;
          creator_wallet: string;
          user_id: string | null;
          launch_date: string;
          migrated: boolean;
          migrated_at: string | null;
          ath_market_cap: number | null;
          current_market_cap: number | null;
          total_volume: number | null;
          holder_count: number | null;
          status: 'active' | 'inactive' | 'rug';
          score: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          // New fields for feePayer verification and rug tracking
          creation_signature: string | null;
          creation_verified: boolean;
          migration_pool_address: string | null;
          rug_severity: 'soft' | 'hard' | null;
          dev_sell_percent: number | null;
        };
        Insert: {
          id?: string;
          mint_address: string;
          name: string;
          symbol: string;
          creator_wallet: string;
          user_id?: string | null;
          launch_date: string;
          migrated?: boolean;
          migrated_at?: string | null;
          ath_market_cap?: number | null;
          current_market_cap?: number | null;
          total_volume?: number | null;
          holder_count?: number | null;
          status?: 'active' | 'inactive' | 'rug';
          score?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // New fields
          creation_signature?: string | null;
          creation_verified?: boolean;
          migration_pool_address?: string | null;
          rug_severity?: 'soft' | 'hard' | null;
          dev_sell_percent?: number | null;
        };
        Update: {
          id?: string;
          mint_address?: string;
          name?: string;
          symbol?: string;
          creator_wallet?: string;
          user_id?: string | null;
          launch_date?: string;
          migrated?: boolean;
          migrated_at?: string | null;
          ath_market_cap?: number | null;
          current_market_cap?: number | null;
          total_volume?: number | null;
          holder_count?: number | null;
          status?: 'active' | 'inactive' | 'rug';
          score?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          // New fields
          creation_signature?: string | null;
          creation_verified?: boolean;
          migration_pool_address?: string | null;
          rug_severity?: 'soft' | 'hard' | null;
          dev_sell_percent?: number | null;
        };
      };
      score_history: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          score_breakdown: Json;
          calculated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          score_breakdown: Json;
          calculated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          score_breakdown?: Json;
          calculated_at?: string;
        };
      };
      profile_views: {
        Row: {
          id: string;
          user_id: string;
          viewer_ip: string | null;
          viewer_user_id: string | null;
          viewed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          viewer_ip?: string | null;
          viewer_user_id?: string | null;
          viewed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          viewer_ip?: string | null;
          viewer_user_id?: string | null;
          viewed_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      token_status: 'active' | 'inactive' | 'rug';
    };
  };
}

// Helper types
export type User = Database['public']['Tables']['users']['Row'];
export type NewUser = Database['public']['Tables']['users']['Insert'];
export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type NewWallet = Database['public']['Tables']['wallets']['Insert'];
export type Token = Database['public']['Tables']['tokens']['Row'];
export type NewToken = Database['public']['Tables']['tokens']['Insert'];
export type ScoreHistory = Database['public']['Tables']['score_history']['Row'];
export type ProfileView = Database['public']['Tables']['profile_views']['Row'];

// KOL (Key Opinion Leader) types
export interface Kol {
  id: string;
  wallet_address: string;
  name: string;
  twitter_url: string | null;
  telegram_url: string | null;
  kolscan_rank: number | null;
  pnl_sol: number | null;
  wins: number;
  losses: number;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewKol {
  wallet_address: string;
  name: string;
  twitter_url?: string | null;
  telegram_url?: string | null;
  kolscan_rank?: number | null;
  pnl_sol?: number | null;
  wins?: number;
  losses?: number;
  user_id?: string | null;
}
