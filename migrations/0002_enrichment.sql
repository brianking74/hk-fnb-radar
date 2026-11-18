-- Release 1.5 — enrichment: verified attributes (cuisine etc.) and contacts.
-- Every row must carry source attribution. Nothing is fabricated; rows only
-- enter via verified public sources (Google Places with attribution, manual
-- verification, licensed feeds) through the admin ingestion endpoints.

CREATE TABLE IF NOT EXISTS entity_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL REFERENCES entities (id),
  kind TEXT NOT NULL CHECK (kind IN ('cuisine', 'category', 'other')),
  value TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TEXT NOT NULL,
  UNIQUE (entity_id, kind, value, source_name)
);
CREATE INDEX IF NOT EXISTS idx_attributes_entity ON entity_attributes (entity_id, kind);
CREATE INDEX IF NOT EXISTS idx_attributes_kind_value ON entity_attributes (kind, value);
