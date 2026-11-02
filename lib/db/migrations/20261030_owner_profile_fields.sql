ALTER TABLE public.homza_users
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS profile_photo text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'individual_owner',
  ADD COLUMN IF NOT EXISTS preferred_contact_method text NOT NULL DEFAULT 'homza_chat';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homza_users_account_type_check') THEN
    ALTER TABLE public.homza_users ADD CONSTRAINT homza_users_account_type_check
      CHECK (account_type IN ('individual_owner', 'property_agent', 'real_estate_company'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'homza_users_preferred_contact_method_check') THEN
    ALTER TABLE public.homza_users ADD CONSTRAINT homza_users_preferred_contact_method_check
      CHECK (preferred_contact_method IN ('phone', 'whatsapp', 'homza_chat'));
  END IF;
END $$;
