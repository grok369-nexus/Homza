-- Additive migration: records genuine tenant enquiries against individual listings.
CREATE TABLE IF NOT EXISTS homza_property_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES homza_properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES homza_users(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS homza_property_leads_property_created_at_idx
  ON homza_property_leads (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS homza_property_leads_tenant_created_at_idx
  ON homza_property_leads (tenant_id, created_at DESC);

-- Access is mediated by the Homza API's authenticated, owner-scoped endpoints.
-- Direct Supabase Data API access is blocked unless explicit policies are added.
ALTER TABLE homza_property_leads ENABLE ROW LEVEL SECURITY;
