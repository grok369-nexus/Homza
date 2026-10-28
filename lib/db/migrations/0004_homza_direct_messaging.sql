-- Additive schema for private, persistent tenant-owner conversations.
CREATE TABLE IF NOT EXISTS public.homza_message_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.homza_properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.homza_users(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.homza_users(id) ON DELETE CASCADE,
  last_tenant_read_at timestamptz,
  last_owner_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT homza_message_conversations_distinct_participants CHECK (tenant_id <> owner_id),
  CONSTRAINT homza_message_conversations_property_tenant_unique UNIQUE (property_id, tenant_id)
);
CREATE INDEX IF NOT EXISTS homza_message_conversations_tenant_updated_idx
  ON public.homza_message_conversations (tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS homza_message_conversations_owner_updated_idx
  ON public.homza_message_conversations (owner_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.homza_direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.homza_message_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.homza_users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS homza_direct_messages_conversation_created_idx
  ON public.homza_direct_messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS homza_direct_messages_sender_created_idx
  ON public.homza_direct_messages (sender_id, created_at DESC);

-- Access is mediated through Homza's authenticated API, not direct client table access.
ALTER TABLE public.homza_message_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homza_direct_messages ENABLE ROW LEVEL SECURITY;
