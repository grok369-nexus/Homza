import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Prefer the IPv4-compatible Supavisor URL for Vercel. Keep DATABASE_URL as
// a fallback for local development and migration tooling.
const poolerUrl = process.env.SUPABASE_POOLER_URL?.trim();
const databaseUrl = process.env.DATABASE_URL?.trim();
const selectedEnvName = poolerUrl ? "SUPABASE_POOLER_URL" : "DATABASE_URL";
const rawConnectionString = poolerUrl || databaseUrl;

if (!rawConnectionString) {
  throw new Error(
    "Set SUPABASE_POOLER_URL for deployed traffic or DATABASE_URL for local/direct database access.",
  );
}

let connectionString = rawConnectionString;
let connectionUrl: URL;

try {
  connectionUrl = new URL(rawConnectionString);
} catch {
  throw new Error(`${selectedEnvName} is not a valid PostgreSQL connection URL.`);
}

// Supavisor requires the project-qualified database username. Correct the
// common "postgres" username mistake automatically for this project's pooler.
const isSupabasePooler = connectionUrl.hostname.endsWith(".pooler.supabase.com");
const expectedPoolerUsername = "postgres.iagdyoixmasimwkvykoz";

if (isSupabasePooler && connectionUrl.username === "postgres") {
  connectionUrl.username = expectedPoolerUsername;
  connectionString = connectionUrl.toString();
  console.warn(
    `[${selectedEnvName}] Pooler URL had username "postgres"; corrected it to the project-qualified Supabase username.`,
  );
}

if (isSupabasePooler && connectionUrl.username !== expectedPoolerUsername) {
  throw new Error(
    `${selectedEnvName} uses the Supabase pooler but has an unexpected database username. Expected the project-qualified username.`,
  );
}

// Log connection routing metadata only—never log the URL or its password.
console.info("[database] Connection configuration", {
  source: selectedEnvName,
  host: connectionUrl.hostname,
  username: connectionUrl.username,
  pooler: isSupabasePooler,
});

if (
  connectionUrl.hostname.startsWith("db.") &&
  connectionUrl.hostname.endsWith(".supabase.co") &&
  !poolerUrl
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
