# Homza database and authentication setup

Homza's API now uses PostgreSQL for accounts, sessions, listings, favourites, saved searches, reports, and contact messages. Sign-in uses a server-side session; the browser receives only an HTTP-only cookie. Passwords are stored as salted scrypt hashes, never as plaintext.

## 1. Create a PostgreSQL database

Create a PostgreSQL database. Supabase Postgres is supported; for a serverless deployment, use a Supabase connection string intended for application/server connections (the session pooler is a good default). Do not put database credentials in frontend environment variables or commit them to Git.

## 2. Create the tables

Run the complete SQL in `lib/db/migrations/0001_homza_core.sql` once in your database's SQL editor. It creates the Homza tables, foreign keys, role/status enums, checks, and indexes.

## 3. Set the Vercel environment variable

In Vercel → Homza project → Settings → Environment Variables, add:

- `DATABASE_URL`: the PostgreSQL connection string, including its required SSL options.

Set it for Production and Preview (and Development if you use Vercel's local development commands). Redeploy after saving it. Never use a browser-exposed variable such as `VITE_DATABASE_URL`.

## 4. Create the first administrator

1. Register your own account through Homza using the normal registration form.
2. In the database SQL editor, promote only that account to admin, replacing the example email:

```sql
UPDATE homza_users
SET role = 'admin'
WHERE email = lower('you@example.com');
```

3. Confirm exactly one row was updated. Sign out and sign in again.

Public registration intentionally cannot create an admin account. Owner accounts start with verification status `pending`; registration does not verify a person or a property.

## Current access rules

- Anyone can browse available properties and submit a report or contact message.
- Tenants can manage only their own favourites and saved searches.
- Owners can create and manage only their own listings.
- Admin-only dashboard data requires an admin session.
- Listings created by owners start as `pending` and unverified.
- Sessions expire after seven days; their raw tokens are never stored in the database.

## Important before launch

The database migration and `DATABASE_URL` must be applied before the API can serve authenticated or persistent requests. Do not mark demo/sample property cards as verified in production. Payment handling, real owner identity checks, email verification/password reset, and abuse-rate limiting still need separate implementation before a public launch.
