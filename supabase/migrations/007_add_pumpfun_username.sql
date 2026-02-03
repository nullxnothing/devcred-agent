-- Migration: Add pump.fun username support
-- Allows users to link their pump.fun display name to their DevKarma profile

-- Add pumpfun_username column to dk_users
ALTER TABLE dk_users ADD COLUMN IF NOT EXISTS pumpfun_username VARCHAR(50);

-- Create unique index to prevent duplicate usernames
CREATE UNIQUE INDEX IF NOT EXISTS idx_dk_users_pumpfun_username_unique
ON dk_users(pumpfun_username)
WHERE pumpfun_username IS NOT NULL AND pumpfun_username != '';

-- Add comment
COMMENT ON COLUMN dk_users.pumpfun_username IS
'User''s display name from pump.fun profile - manually entered or auto-synced';
