import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { inArray } from "drizzle-orm";
import { db, pool, sessions, users } from "@workspace/db";

const scrypt = promisify(scryptCallback);
const ACCOUNT_IDS = [
  "a1000000-0000-4000-8000-000000000001",
  "a1000000-0000-4000-8000-000000000002",
  "660ae0a5-7e9d-479a-988e-f59da70d5e86",
  "c11df3c0-de77-45f9-8de1-c8672a334b75",
  "56ac53d1-661f-4f2b-8a90-336891de5f68",
  "aed60fb9-ecee-4a24-81b7-b308c5f72110",
] as const;

const CONFIRMATION = "RESET_THE_SIX_TEST_ACCOUNTS";

async function passwordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

async function main() {
  const password = process.env.HOMZA_TEST_RESET_PASSWORD;
  const confirmed = process.env.HOMZA_TEST_RESET_CONFIRM === CONFIRMATION;

  if (!password || password.length < 10 || password.length > 200) {
    throw new Error("Set HOMZA_TEST_RESET_PASSWORD to a password 10–200 characters long.");
  }

  const targets = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.id, [...ACCOUNT_IDS]));

  if (targets.length !== ACCOUNT_IDS.length) {
    throw new Error(
      `Safety stop: expected exactly ${ACCOUNT_IDS.length} target accounts, found ${targets.length}. No changes made.`,
    );
  }

  console.info(`Verified ${targets.length} exact test accounts. Password values will not be logged.`);
  if (!confirmed) {
    console.info("DRY RUN ONLY. No database changes were made.");
    console.info(`To apply, set HOMZA_TEST_RESET_CONFIRM=${CONFIRMATION} and rerun.`);
    return;
  }

  const hashes = await Promise.all(ACCOUNT_IDS.map(async (id) => ({
    id,
    passwordHash: await passwordHash(password),
  })));

  await db.transaction(async (tx) => {
    for (const item of hashes) {
      await tx.update(users)
        .set({ passwordHash: item.passwordHash })
        .where(inArray(users.id, [item.id]));
    }
    await tx.delete(sessions).where(inArray(sessions.userId, [...ACCOUNT_IDS]));
  });

  const verified = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.id, [...ACCOUNT_IDS]));

  if (verified.length !== ACCOUNT_IDS.length) {
    throw new Error("Post-update verification failed; inspect the database before retrying.");
  }

  console.info(`Updated password hashes for ${verified.length} test accounts and revoked their existing sessions.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Password reset failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
