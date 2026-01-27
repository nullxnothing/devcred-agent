-- DevKarma Database Schema
-- Tables prefixed with 'dk_' to avoid conflicts with existing schema

-- Enable UUID extension (if not exists)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Token status enum (only if not exists)
DO $$ BEGIN
  CREATE TYPE dk_token_status AS ENUM ('active', 'inactive', 'rug');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- DevKarma Users table (Twitter auth data)
CREATE TABLE IF NOT EXISTS dk_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  twitter_id VARCHAR(255) UNIQUE NOT NULL,
  twitter_handle VARCHAR(255) UNIQUE NOT NULL,
  twitter_name VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  total_score DECIMAL(10, 2) DEFAULT 0,
  rank INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for dk_users
CREATE INDEX IF NOT EXISTS idx_dk_users_twitter_handle ON dk_users(twitter_handle);
CREATE INDEX IF NOT EXISTS idx_dk_users_rank ON dk_users(rank) WHERE rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dk_users_score ON dk_users(total_score DESC);

-- DevKarma Wallets table (verified wallet addresses)
CREATE TABLE IF NOT EXISTS dk_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES dk_users(id) ON DELETE CASCADE,
  address VARCHAR(64) UNIQUE NOT NULL,
  label VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for dk_wallets
CREATE INDEX IF NOT EXISTS idx_dk_wallets_user_id ON dk_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_dk_wallets_address ON dk_wallets(address);

-- DevKarma Tokens table (launch history & stats)
CREATE TABLE IF NOT EXISTS dk_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mint_address VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  creator_wallet VARCHAR(64) NOT NULL,
  user_id UUID REFERENCES dk_users(id) ON DELETE SET NULL,
  launch_date TIMESTAMP WITH TIME ZONE NOT NULL,
  migrated BOOLEAN DEFAULT FALSE,
  migrated_at TIMESTAMP WITH TIME ZONE,
  ath_market_cap DECIMAL(20, 2),
  current_market_cap DECIMAL(20, 2),
  total_volume DECIMAL(20, 2),
  holder_count INTEGER,
  status dk_token_status DEFAULT 'active',
  score DECIMAL(10, 2) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for dk_tokens
CREATE INDEX IF NOT EXISTS idx_dk_tokens_creator_wallet ON dk_tokens(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_dk_tokens_user_id ON dk_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_dk_tokens_mint_address ON dk_tokens(mint_address);
CREATE INDEX IF NOT EXISTS idx_dk_tokens_launch_date ON dk_tokens(launch_date DESC);

-- DevKarma Score history table
CREATE TABLE IF NOT EXISTS dk_score_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES dk_users(id) ON DELETE CASCADE,
  score DECIMAL(10, 2) NOT NULL,
  score_breakdown JSONB NOT NULL,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for dk_score_history
CREATE INDEX IF NOT EXISTS idx_dk_score_history_user_id ON dk_score_history(user_id);
CREATE INDEX IF NOT EXISTS idx_dk_score_history_calculated_at ON dk_score_history(calculated_at DESC);

-- DevKarma Profile views table
CREATE TABLE IF NOT EXISTS dk_profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES dk_users(id) ON DELETE CASCADE,
  viewer_ip VARCHAR(45),
  viewer_user_id UUID REFERENCES dk_users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for dk_profile_views
CREATE INDEX IF NOT EXISTS idx_dk_profile_views_user_id ON dk_profile_views(user_id);
CREATE INDEX IF NOT EXISTS idx_dk_profile_views_viewed_at ON dk_profile_views(viewed_at DESC);

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION dk_update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_dk_users_updated_at ON dk_users;
CREATE TRIGGER update_dk_users_updated_at
  BEFORE UPDATE ON dk_users
  FOR EACH ROW
  EXECUTE FUNCTION dk_update_updated_at_column();

DROP TRIGGER IF EXISTS update_dk_tokens_updated_at ON dk_tokens;
CREATE TRIGGER update_dk_tokens_updated_at
  BEFORE UPDATE ON dk_tokens
  FOR EACH ROW
  EXECUTE FUNCTION dk_update_updated_at_column();
