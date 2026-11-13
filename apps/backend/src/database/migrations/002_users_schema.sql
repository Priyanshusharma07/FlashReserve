-- 002_users_schema.sql
-- User management, authentication, and performance indexes for Next.js UI

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_user_role CHECK (role IN ('user', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Composite indexes for efficient customer history and admin pagination
CREATE INDEX IF NOT EXISTS idx_reservations_user_created ON reservations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON reservations (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flash_campaigns_created ON flash_campaigns (created_at DESC);

