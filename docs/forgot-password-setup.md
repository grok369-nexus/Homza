# Homza password reset setup

The password reset feature uses Resend for email delivery and the existing Homza PostgreSQL database.

## Required Vercel environment variables

Configure these in **Vercel → Homza → Settings → Environment Variables**. Do not commit their values to GitHub.

- `RESEND_API_KEY`: a Resend API key with permission to send email.
- `RESEND_FROM_EMAIL`: a sender identity verified in Resend, for example `Homza <support@your-verified-domain>`.
- `HOMZA_PUBLIC_URL`: the exact trusted origin used to build reset links, e.g. `https://homza-chi.vercel.app`. Do not include a path.

Set production values for Production. For Preview, use a separate test configuration and preferably an isolated preview database; do not test reset flows against production user accounts or production data.

## Database migration

Before enabling the API endpoint, apply `lib/db/migrations/0002_homza_password_reset.sql` to the Homza PostgreSQL database. This creates the reset-token table and rate-limit indexes. The application does not automatically apply SQL migrations during deployment.

Apply the migration through the project's approved Supabase SQL workflow. Review the SQL first and confirm the target project/environment before running it. It creates a new table and indexes; it does not alter existing user or session rows.

## Resend setup

1. Create or open the Resend account.
2. Verify a sending domain or use a sender identity allowed by your Resend account.
3. Create an API key with the minimum permissions needed to send email.
4. Add the three environment variables above in Vercel.
5. Redeploy the Preview deployment after setting Preview variables.

## Security behavior

- The UI always gives a generic confirmation for valid email requests, whether or not an account exists.
- Reset tokens are generated with a cryptographically secure random generator; only token hashes are stored.
- Links expire after 30 minutes and are single-use.
- Passwords must be 10–200 characters and use Homza's existing scrypt password hashing.
- Successful reset invalidates the user's existing sessions.
- Requests are rate-limited by requester and email hash; old request metadata is cleaned up after 30 days.
- Reset links use `HOMZA_PUBLIC_URL`, not the incoming request Host header.

## Preview verification checklist

- [ ] The migration was applied to the intended non-production database.
- [ ] Resend's sender identity is verified.
- [ ] A reset email arrives and the link opens the Preview URL.
- [ ] A valid link resets the password and allows login with the new password.
- [ ] The old password no longer works.
- [ ] Reusing the link and using an expired/invalid token are rejected.
- [ ] Existing sessions are invalidated after reset.
- [ ] Unknown email addresses receive the same generic confirmation.
- [ ] Production environment variables and production data remain untouched until the PR is approved and merged.
