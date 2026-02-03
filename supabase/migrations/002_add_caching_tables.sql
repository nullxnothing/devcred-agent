-- Migration: Add caching tables for wallet token discovery and scan results
-- These tables provide database-level caching for expensive API operations

-- ============================================================
-- Wallet Tokens Cache
-- Caches the list of tokens created by a wallet (24h TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS dk_wallet_tokens_cache (
  wallet_address TEXT PRIMARY KEY,
  tokens JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_cache_time
  ON dk_wallet_tokens_cache(cached_at);

-- ============================================================
-- Wallet Scan Cache
-- Caches full wallet scan results including scores (1h TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS dk_wallet_scan_cache (
  wallet_address TEXT PRIMARY KEY,
  total_score INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL DEFAULT 'unverified',
  token_count INTEGER NOT NULL DEFAULT 0,
  migration_count INTEGER NOT NULL DEFAULT 0,
  rug_count INTEGER NOT NULL DEFAULT 0,
  tokens_data JSONB,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_wallet_scan_cache_time
  ON dk_wallet_scan_cache(cached_at);

-- ============================================================
-- Token Market Data Cache (optional - for heavy traffic)
-- Caches DexScreener market data (5min TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS dk_token_market_cache (
  mint_address TEXT PRIMARY KEY,
  price_usd TEXT,
  market_cap BIGINT,
  fdv BIGINT,
  liquidity BIGINT,
  volume_24h BIGINT,
  dex_id TEXT,
  migrated BOOLEAN DEFAULT FALSE,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cache expiry cleanup
CREATE INDEX IF NOT EXISTS idx_token_market_cache_time
  ON dk_token_market_cache(cached_at);

-- ============================================================
-- Update dk_tokens table with new fields
-- ============================================================

-- Add holder count tracking
ALTER TABLE dk_tokens
  ADD COLUMN IF NOT EXISTS holder_count INTEGER,
  ADD COLUMN IF NOT EXISTS holder_count_updated_at TIMESTAMPTZ;

-- Add dev holding tracking
ALTER TABLE dk_tokens
  ADD COLUMN IF NOT EXISTS dev_holding_percent DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS dev_holding_updated_at TIMESTAMPTZ;

-- Add score breakdown storage
ALTER TABLE dk_tokens
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB;

-- ============================================================
-- Helper function to clean up expired cache
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS TABLE(
  tokens_deleted INTEGER,
  scans_deleted INTEGER,
  market_deleted INTEGER
) AS $$
DECLARE
  t_count INTEGER;
  s_count INTEGER;
  m_count INTEGER;
BEGIN
  -- Clean wallet tokens cache (24h)
  DELETE FROM dk_wallet_tokens_cache
  WHERE cached_at < NOW() - INTERVAL '24 hours';
  GET DIAGNOSTICS t_count = ROW_COUNT;

  -- Clean wallet scan cache (1h)
  DELETE FROM dk_wallet_scan_cache
  WHERE cached_at < NOW() - INTERVAL '1 hour';
  GET DIAGNOSTICS s_count = ROW_COUNT;

  -- Clean market data cache (5min)
  DELETE FROM dk_token_market_cache
  WHERE cached_at < NOW() - INTERVAL '5 minutes';
  GET DIAGNOSTICS m_count = ROW_COUNT;

  RETURN QUERY SELECT t_count, s_count, m_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON TABLE dk_wallet_tokens_cache IS 'Caches token creation discovery results (24h TTL)';
COMMENT ON TABLE dk_wallet_scan_cache IS 'Caches full wallet scan results with scores (1h TTL)';
COMMENT ON TABLE dk_token_market_cache IS 'Caches DexScreener market data (5min TTL)';
COMMENT ON FUNCTION cleanup_expired_cache IS 'Removes expired cache entries - run periodically via cron';
