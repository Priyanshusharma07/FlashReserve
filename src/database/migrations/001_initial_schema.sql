-- 001_initial_schema.sql
-- High-Concurrency Flash-Sale & Inventory Reservation Engine

-- Migration history table
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flash Campaigns table
CREATE TABLE IF NOT EXISTS flash_campaigns (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  price_cents INTEGER NOT NULL,
  total_inventory INTEGER NOT NULL,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  version BIGINT NOT NULL DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_price_nonnegative CHECK (price_cents >= 0),
  CONSTRAINT chk_inventory_nonnegative CHECK (total_inventory >= 0),
  CONSTRAINT chk_reserved_nonnegative CHECK (reserved_count >= 0),
  CONSTRAINT chk_reserved_lte_total CHECK (reserved_count <= total_inventory),
  CONSTRAINT chk_valid_time_range CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_flash_campaigns_window ON flash_campaigns (starts_at, ends_at);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id VARCHAR(36) PRIMARY KEY,
  campaign_id VARCHAR(64) NOT NULL REFERENCES flash_campaigns(id) ON DELETE RESTRICT,
  user_id VARCHAR(64) NOT NULL,
  quantity SMALLINT NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  db_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  db_tx_version BIGINT DEFAULT 1,
  CONSTRAINT uq_campaign_user UNIQUE (campaign_id, user_id),
  CONSTRAINT chk_reservation_quantity CHECK (quantity > 0),
  CONSTRAINT chk_reservation_status CHECK (status IN ('RESERVED', 'PAID', 'EXPIRED', 'CANCELLED'))
);

CREATE INDEX IF NOT EXISTS idx_reservations_status_expires
  ON reservations (status, expires_at)
  WHERE status = 'RESERVED';

CREATE INDEX IF NOT EXISTS idx_reservations_campaign ON reservations (campaign_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations (user_id);
