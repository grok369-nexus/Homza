import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, sessions, users } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  clearSessionCookie,
  hashToken,
  passwordHash,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from "../lib/auth";

const router: IRouter = Router();
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function logAuthFailure(action: "register" | "login" | "logout", error: unknown) {
  const err = error instanceof Error ? error as Error & { code?: string; cause?: unknown; constraint?: string; table?: string; column?: string; severity?: string } : undefined;
  const cause = err?.cause && typeof err.cause === "object" ? err.cause as Record<string, unknown> : undefined;
  // Never log credentials, passwords, cookies, or connection strings.
  logger.error({
    action,
    errorName: err?.name ?? "UnknownError",
    errorCode: err?.code ?? (typeof cause?.code === "string" ? cause.code : undefined),
    errorSeverity: err?.severity ?? (typeof cause?.severity === "string" ? cause.severity : undefined),
    errorTable: err?.table ?? (typeof cause?.table === "string" ? cause.table : undefined),
    errorColumn: err?.column ?? (typeof cause?.column === "string" ? cause.column : undefined),
    errorConstraint: err?.constraint ?? (typeof cause?.constraint === "string" ? cause.constraint : undefined),
    causeName: typeof cause?.name === "string" ? cause.name : undefined,
  }, "Homza authentication request failed");
}


function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone: string | null;
  displayName?: string | null;
  profilePhoto?: string | null;
  accountType?: string;
  preferredContactMethod?: string;
  ownerVerificationStatus: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
    displayName: user.displayName ?? null,
    profilePhoto: user.profilePhoto ?? null,
    accountType: user.accountType ?? "individual_owner",
    preferredContactMethod: user.preferredContactMethod ?? "homza_chat",
    ownerVerificationStatus: user.ownerVerificationStatus,
  };
}

async function startSession(userId: string, res: Parameters<typeof setSessionCookie>[0]) {
  const token = randomBytes(32).toString("base64url");
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  });
  setSessionCookie(res, token);
}

router.post("/auth/register", async (req, res, next) => {
  try {
    const fullName = typeof req.body?.fullName === "string" ? req.body.fullName.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const requestedRole = req.body?.role;
    const role = requestedRole === "owner" ? "owner" : requestedRole === "tenant" ? "tenant" : null;

    if (fullName.length < 2 || fullName.length > 100) {
      return res.status(400).json({ error: "Enter your full name" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }
    if (password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: "Use a password between 10 and 200 characters" });
    }
    if (!role) return res.status(400).json({ error: "Choose tenant or owner account" });

    const passwordDigest = await passwordHash(password);
    const [user] = await db.insert(users).values({
      fullName,
      email,
      passwordHash: passwordDigest,
      role,
      ownerVerificationStatus: role === "owner" ? "pending" : "unverified",
    }).returning({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
      phone: users.phone,
      ownerVerificationStatus: users.ownerVerificationStatus,
    });

    await startSession(user.id, res);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    logAuthFailure("register", error);
    return next(error);
  }
});

router.post("/auth/login", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password || email.length > 254 || password.length > 200) {
      return res.status(400).json({ error: "Enter your email and password" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect" });
    }

    await startSession(user.id, res);
    return res.json({ user: publicUser(user) });
  } catch (error) {
    logAuthFailure("login", error);
    return next(error);
  }
});

router.post("/auth/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.homza_session;
    if (typeof token === "string" && token.length >= 32) {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    }
    clearSessionCookie(res);
    return res.status(204).send();
  } catch (error) {
    logAuthFailure("logout", error);
    return next(error);
  }
});

router.get("/auth/me", requireAuth, (req, res) => {
  return res.json({ user: req.homzaUser });
});

router.patch("/auth/me", requireAuth, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : undefined;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const profilePhoto = typeof body.profilePhoto === "string" ? body.profilePhoto.trim() : undefined;
    const accountType = body.accountType;
    const preferredContactMethod = body.preferredContactMethod;

    if (fullName !== undefined && (fullName.length < 2 || fullName.length > 100)) {
      return res.status(400).json({ error: "Enter your full legal name (2–100 characters)." });
    }
    if (displayName !== undefined && displayName.length > 80) {
      return res.status(400).json({ error: "Display name must be 80 characters or fewer." });
    }
    if (email !== undefined && (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254)) {
      return res.status(400).json({ error: "Enter a valid email address." });
    }
    if (phone !== undefined && phone.length > 30) {
      return res.status(400).json({ error: "Phone number must be 30 characters or fewer." });
    }
    if (profilePhoto !== undefined && profilePhoto.length > 2048) {
      return res.status(400).json({ error: "Profile photo URL is too long." });
    }
    if (accountType !== undefined && !["individual_owner", "property_agent", "real_estate_company"].includes(accountType)) {
      return res.status(400).json({ error: "Choose a valid account type." });
    }
    if (preferredContactMethod !== undefined && !["phone", "whatsapp", "homza_chat"].includes(preferredContactMethod)) {
      return res.status(400).json({ error: "Choose a valid contact method." });
    }

    const update: Record<string, unknown> = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (displayName !== undefined) update.displayName = displayName || null;
    if (phone !== undefined) update.phone = phone || null;
    if (email !== undefined) update.email = email;
    if (profilePhoto !== undefined) update.profilePhoto = profilePhoto || null;
    if (accountType !== undefined) update.accountType = accountType;
    if (preferredContactMethod !== undefined) update.preferredContactMethod = preferredContactMethod;
    if (!Object.keys(update).length) return res.status(400).json({ error: "No profile changes were provided." });

    const [user] = await db.update(users).set(update).where(eq(users.id, req.homzaUser!.id)).returning();
    if (!user) return res.status(404).json({ error: "Account not found." });
    return res.json({ user: publicUser(user) });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "That email address is already in use." });
    }
    return next(error);
  }
});

export default router;
