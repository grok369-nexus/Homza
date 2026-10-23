-- Password reset tokens and persistent rate-limit metadata.
-- Token values are never stored in plaintext; only SHA-256 token hashes are persisted.
CREATE TABLE homza_password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES homza_users(id) ON DELETE CASCADE,
  token_hash text UNIQUE,
  requester_hash text NOT NULL,
  email_hash text NOT NULL,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX homza_password_reset_requester_created_idx
  ON homza_password_reset_tokens (requester_hash, created_at);
CREATE INDEX homza_password_reset_email_created_idx
  ON homza_password_reset_tokens (email_hash, created_at);
