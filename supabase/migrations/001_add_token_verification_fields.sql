-- Migration: Add token verification and rug tracking fields
-- Date: 2026-01-27
-- Description: Adds feePayer-based creator verification and rug detection fields

-- Add rug severity enum (if not exists)
DO $$ BEGIN
  CREATE TYPE dk_rug_severity AS ENUM ('soft', 'hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to dk_tokens table for creator verification
ALTER TABLE dk_tokens ADD COLUMN IF NOT EXISTS creation_signature TEXT;
ALTER TABLE dk_tokens ADD COLUMN IF NOT EXISTS creation_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE dk_tokens ADD COLUMN IF NOT EXISTS migration_pool_address TEXT;

-- Add new columns for rug tracking
ALTER TABLE dk_tokens ADD COLUMN IF NOT EXISTS rug_severity dk_rug_severity;
ALTER TABLE dk_tokens ADD COLUMN IF NOT EXISTS dev_sell_percent DECIMAL(5,2);

-- Create index on creation_verified for filtering verified tokens
CREATE INDEX IF NOT EXISTS idx_dk_tokens_creation_verified ON dk_tokens(creation_verified) WHERE creation_verified = TRUE;

-- Create index on rug_severity for filtering rugs
CREATE INDEX IF NOT EXISTS idx_dk_tokens_rug_severity ON dk_tokens(rug_severity) WHERE rug_severity IS NOT NULL;

-- Update existing tokens to have creation_verified = false (default behavior)
-- This ensures all existing tokens are marked as unverified until re-scanned
UPDATE dk_tokens
SET creation_verified = FALSE
WHERE creation_verified IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN dk_tokens.creation_signature IS 'Transaction signature of the token creation tx (for feePayer verification)';
COMMENT ON COLUMN dk_tokens.creation_verified IS 'Whether the creator was verified via feePayer (true = feePayer matched wallet)';
COMMENT ON COLUMN dk_tokens.migration_pool_address IS 'Address of the migration pool (Raydium, PumpSwap, etc) if token graduated';
COMMENT ON COLUMN dk_tokens.rug_severity IS 'Rug severity: soft (80-90% sold) or hard (90%+ sold fast)';
COMMENT ON COLUMN dk_tokens.dev_sell_percent IS 'Percentage of dev allocation that was sold';
