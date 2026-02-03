-- Migration: Switch to wallet-first authentication
-- This makes wallet the primary identity, Twitter becomes optional

-- Step 1: Add primary_wallet column to dk_users
ALTER TABLE dk_users ADD COLUMN IF NOT EXISTS primary_wallet VARCHAR(64);

-- Step 2: Make twitter_id nullable (no longer required for account creation)
ALTER TABLE dk_users ALTER COLUMN twitter_id DROP NOT NULL;

-- Step 3: Make twitter_handle nullable
ALTER TABLE dk_users ALTER COLUMN twitter_handle DROP NOT NULL;

-- Step 4: Drop unique constraints on twitter fields (allow nulls, multiple nulls)
ALTER TABLE dk_users DROP CONSTRAINT IF EXISTS dk_users_twitter_id_key;
ALTER TABLE dk_users DROP CONSTRAINT IF EXISTS dk_users_twitter_handle_key;

-- Step 5: Backfill primary_wallet from existing dk_wallets for users who have verified wallets
UPDATE dk_users u 
SET primary_wallet = (
  SELECT address FROM dk_wallets w 
  WHERE w.user_id = u.id AND w.is_primary = true
  LIMIT 1
)
WHERE u.primary_wallet IS NULL;

-- For users without a primary wallet set, use any wallet
UPDATE dk_users u 
SET primary_wallet = (
  SELECT address FROM dk_wallets w 
  WHERE w.user_id = u.id
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE u.primary_wallet IS NULL 
AND EXISTS (SELECT 1 FROM dk_wallets w WHERE w.user_id = u.id);

-- Step 6: Create unique index on primary_wallet (allows nulls for legacy Twitter-only accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dk_users_primary_wallet 
ON dk_users(primary_wallet) 
WHERE primary_wallet IS NOT NULL;

-- Step 7: Create partial unique indexes for twitter fields (to allow multiple NULLs but unique non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dk_users_twitter_id_unique 
ON dk_users(twitter_id) 
WHERE twitter_id IS NOT NULL AND twitter_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_dk_users_twitter_handle_unique 
ON dk_users(twitter_handle) 
WHERE twitter_handle IS NOT NULL AND twitter_handle != '';

-- Step 8: Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_dk_users_primary_wallet_lookup 
ON dk_users(primary_wallet);

-- Note: Existing users without wallets can still use Twitter login
-- New users will primarily use wallet login
-- Twitter linking becomes optional for both new and existing users
