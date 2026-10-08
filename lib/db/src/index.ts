import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before the Homza API can access persistent storage.");
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
