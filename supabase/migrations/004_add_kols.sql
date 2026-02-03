-- Migration: Add KOL (Key Opinion Leader) tracking
-- KOLs are scraped from kolscan.io leaderboard

CREATE TABLE dk_kols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  twitter_url TEXT,
  telegram_url TEXT,
  kolscan_rank INTEGER,
  pnl_sol DECIMAL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  user_id UUID REFERENCES dk_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_kols_wallet ON dk_kols(wallet_address);
CREATE INDEX idx_kols_user ON dk_kols(user_id);
CREATE INDEX idx_kols_rank ON dk_kols(kolscan_rank);
