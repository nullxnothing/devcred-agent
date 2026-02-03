-- Migration: Make user_id nullable in dk_wallet_nonces
-- This is required for wallet-first authentication where nonces are created before user exists

-- Allow NULL user_id for public wallet authentication
ALTER TABLE dk_wallet_nonces ALTER COLUMN user_id DROP NOT NULL;

-- Add comment explaining when user_id is NULL
COMMENT ON COLUMN dk_wallet_nonces.user_id IS
'User ID is NULL for wallet-first authentication (new users), set for adding secondary wallets to existing accounts';
