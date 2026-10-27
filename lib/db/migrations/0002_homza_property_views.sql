-- Additive migration: preserves existing Homza data and tables.
CREATE TABLE IF NOT EXISTS homza_property_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES homza_properties(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homza_property_views_property_viewed_at_idx
  ON homza_property_views (property_id, viewed_at);
