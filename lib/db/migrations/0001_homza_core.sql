CREATE TYPE homza_role AS ENUM ('tenant', 'owner', 'admin');
CREATE TYPE homza_owner_verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE homza_property_status AS ENUM ('available', 'pending', 'rented', 'paused', 'hidden');
CREATE TYPE homza_report_status AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

CREATE TABLE homza_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role homza_role NOT NULL DEFAULT 'tenant',
  phone text,
  owner_verification_status homza_owner_verification_status NOT NULL DEFAULT 'unverified',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homza_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES homza_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX homza_sessions_user_id_idx ON homza_sessions(user_id);
CREATE INDEX homza_sessions_expires_at_idx ON homza_sessions(expires_at);

CREATE TABLE homza_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES homza_users(id) ON DELETE RESTRICT,
  title text NOT NULL,
  type text NOT NULL,
  location text NOT NULL,
  district text NOT NULL,
  neighborhood text NOT NULL,
  rent integer NOT NULL CHECK (rent > 0),
  advance_months integer NOT NULL DEFAULT 1 CHECK (advance_months > 0),
  bedrooms integer NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms integer NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  size integer,
  image text NOT NULL,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text NOT NULL DEFAULT '',
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  status homza_property_status NOT NULL DEFAULT 'pending',
  verified boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  leads integer NOT NULL DEFAULT 0 CHECK (leads >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_verified_at timestamptz
);
CREATE INDEX homza_properties_owner_id_idx ON homza_properties(owner_id);
CREATE INDEX homza_properties_public_search_idx ON homza_properties(status, district, neighborhood, rent);

CREATE TABLE homza_favorites (
  user_id uuid NOT NULL REFERENCES homza_users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES homza_properties(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, property_id)
);

CREATE TABLE homza_saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES homza_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX homza_saved_searches_user_id_idx ON homza_saved_searches(user_id);

CREATE TABLE homza_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES homza_properties(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES homza_users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status homza_report_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE homza_contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES homza_users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  topic text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
