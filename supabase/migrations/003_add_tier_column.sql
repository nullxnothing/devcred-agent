-- Migration: Add tier column to dk_users table
-- This stores the calculated dev tier (unverified, verified, trusted, veteran, og)

-- Add tier column to dk_users
ALTER TABLE dk_users
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'unverified';

-- Create index for tier-based queries (leaderboard filtering)
CREATE INDEX IF NOT EXISTS idx_users_tier ON dk_users(tier);

-- Add comment for documentation
COMMENT ON COLUMN dk_users.tier IS 'Dev tier: unverified, verified, trusted, veteran, og';
