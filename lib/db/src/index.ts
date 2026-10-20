import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Vercel's IPv4-only runtime cannot reach Supabase's IPv6-only direct endpoint.
// Keep DATABASE_URL available for migrations/local use, and prefer the IPv4-compatible
// Supavisor URL when configured for deployed API traffic.
const connectionString = process.env.SUPABASE_POOLER_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Set SUPABASE_POOLER_URL for deployed traffic (recommended) or DATABASE_URL for local/direct database access.",
  );
}

const connectionHost = (() => {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return "";
  }
})();

if (
  connectionHost.startsWith("db.") &&
  connectionHost.endsWith(".supabase.co") &&
  !process.env.SUPABASE_POOLER_URL
) {
  console.warn(
    "DATABASE_URL points to Supabase's direct database endpoint. Vercel may not resolve it because direct endpoints are IPv6-only; set SUPABASE_POOLER_URL to the project's shared Supavisor connection string.",
  );
}

// Keep the pool small because Vercel can run several independent function instances.
export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 2),
  idleTimeoutMillis: 5_000,
  connectionTimeoutMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
