-- HK F&B RADAR — initial schema (Release 1)
-- entities: one row per licence record (source + licence number is the natural key).
-- Bilingual fields (EN / Traditional Chinese) are preserved exactly as published by the source.

CREATE TABLE IF NOT EXISTS snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK (source IN ('restaurants', 'liquor', 'other_food')),
  generation_date TEXT,
  captured_at TEXT NOT NULL,
  r2_prefix TEXT,
  record_count INTEGER NOT NULL DEFAULT 0,
  is_baseline INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_snapshots_source ON snapshots (source, captured_at DESC);

CREATE TABLE IF NOT EXISTS entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL CHECK (source IN ('restaurants', 'liquor', 'other_food')),
  licno TEXT NOT NULL,
  name_en TEXT,
  name_tc TEXT,
  address_en TEXT,
  address_tc TEXT,
  lic_type_en TEXT,
  lic_type_tc TEXT,
  district_en TEXT,
  district_tc TEXT,
  info_en TEXT,
  info_tc TEXT,
  conditions TEXT,
  serno TEXT,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'absent')),
  fingerprint TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_seen_snapshot INTEGER,
  UNIQUE (source, licno)
);
CREATE INDEX IF NOT EXISTS idx_entities_source_status ON entities (source, status);
CREATE INDEX IF NOT EXISTS idx_entities_expiry ON entities (expiry_date);
CREATE INDEX IF NOT EXISTS idx_entities_district ON entities (source, district_en);

CREATE TABLE IF NOT EXISTS signals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entities (id),
  source TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('new_record', 'licence_changed', 'expiring_soon', 'no_longer_appearing')),
  snapshot_id INTEGER,
  detected_at TEXT NOT NULL,
  detail_json TEXT,
  is_liquor INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_signals_detected ON signals (detected_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signals (type, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_entity ON signals (entity_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_liquor ON signals (is_liquor, detected_at DESC);

-- Release 2 seam: users, subscriptions (Stripe), server-side entitlements.
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  stripe_customer_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'professional', 'business')),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Release 2/3 seam: contact enrichment. Only populated from verified public
-- sources; every row carries source attribution. Never fabricated.
CREATE TABLE IF NOT EXISTS entity_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entities (id),
  kind TEXT NOT NULL CHECK (kind IN ('website', 'phone', 'social')),
  value TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TEXT NOT NULL,
  UNIQUE (entity_id, kind, value)
);
