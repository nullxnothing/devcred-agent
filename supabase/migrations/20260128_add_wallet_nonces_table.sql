-- Migration: Add wallet nonces table for multi-instance nonce storage

CREATE TABLE IF NOT EXISTS dk_wallet_nonces (
  wallet_address VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL,
  nonce VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_wallet_nonces_expires ON dk_wallet_nonces(expires_at);

-- Auto-cleanup old nonces (optional - can also use application-level cleanup)
-- Runs every 5 minutes, deletes expired nonces
-- Note: Requires pg_cron extension, comment out if not available
-- SELECT cron.schedule('cleanup-expired-nonces', '*/5 * * * *', 'DELETE FROM dk_wallet_nonces WHERE expires_at < NOW()');
