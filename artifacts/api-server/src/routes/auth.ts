import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, count, eq, gte, gt, isNull, lt } from "drizzle-orm";
import { db, passwordResetTokens, sessions, users } from "@workspace/db";
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
  ownerVerificationStatus: string;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    phone: user.phone,
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


const RESET_TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;
const RESET_IP_LIMIT = 10;
const RESET_EMAIL_LIMIT = 4;
const RESET_CONFIRMATION = "If an account matches that email, we’ll send a password reset link shortly.";

router.post("/auth/forgot-password", async (req, res, next) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) || email.length > 254) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    const publicUrl = process.env.HOMZA_PUBLIC_URL?.trim();
    if (!apiKey || !from || !publicUrl) {
      logger.error({ action: "forgot-password", missingConfig: [
        ...(!apiKey ? ["RESEND_API_KEY"] : []),
        ...(!from ? ["RESEND_FROM_EMAIL"] : []),
        ...(!publicUrl ? ["HOMZA_PUBLIC_URL"] : []),
      ] }, "Password reset email is not configured");
      return res.status(503).json({ error: "Password reset email is temporarily unavailable. Please try again later." });
    }

    const now = Date.now();
    // Keep rate-limit metadata bounded; no reset request needs to be retained beyond 30 days.
    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.createdAt, new Date(now - 30 * 24 * 60 * 60 * 1000)));
    const cutoff = new Date(now - RESET_RATE_WINDOW_MS);
    const requesterHash = hashToken(req.ip || "unknown-requester");
    const emailHash = hashToken(email);
    const [ipAttempts] = await db.select({ value: count() }).from(passwordResetTokens)
      .where(and(gte(passwordResetTokens.createdAt, cutoff), eq(passwordResetTokens.requesterHash, requesterHash)));
    const [emailAttempts] = await db.select({ value: count() }).from(passwordResetTokens)
      .where(and(gte(passwordResetTokens.createdAt, cutoff), eq(passwordResetTokens.emailHash, emailHash)));

    if (Number(ipAttempts?.value ?? 0) >= RESET_IP_LIMIT || Number(emailAttempts?.value ?? 0) >= RESET_EMAIL_LIMIT) {
      return res.status(202).json({ message: RESET_CONFIRMATION });
    }

    const [user] = await db.select({ id: users.id, email: users.email, fullName: users.fullName })
      .from(users).where(eq(users.email, email)).limit(1);

    const token = user ? randomBytes(32).toString("base64url") : null;
    await db.insert(passwordResetTokens).values({
      userId: user?.id ?? null,
      tokenHash: token ? hashToken(token) : null,
      requesterHash,
      emailHash,
      expiresAt: token ? new Date(now + RESET_TOKEN_LIFETIME_MS) : null,
    });

    if (user && token) {
      const resetUrl = new URL("/reset-password", publicUrl);
      resetUrl.searchParams.set("token", token);
      const safeName = user.fullName.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
      })[character] ?? character);
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [user.email],
          subject: "Reset your Homza password",
          text: `Hello ${user.fullName},\\n\\nWe received a request to reset your Homza password. Use this link within 30 minutes:\\n${resetUrl.toString()}\\n\\nIf you did not request this, you can ignore this email. Your password will not change.`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#17251f;max-width:560px;margin:auto"><h1 style="color:#183d31">Reset your Homza password</h1><p>Hello ${safeName},</p><p>We received a request to reset your Homza password. This link expires in 30 minutes and can only be used once.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;background:#183d31;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Choose a new password</a></p><p>If the button does not work, copy this link into your browser:</p><p style="word-break:break-all">${resetUrl.toString()}</p><p>If you did not request this, ignore this email. Your password will not change.</p></div>`,
        }),
      });

      if (!emailResponse.ok) {
        await db.update(passwordResetTokens).set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
        logger.error({ action: "forgot-password", providerStatus: emailResponse.status }, "Password reset email delivery failed");
        return res.status(503).json({ error: "We could not send a reset email right now. Please try again later." });
      }
    }

    return res.status(202).json({ message: RESET_CONFIRMATION });
  } catch (error) {
    logger.error({ action: "forgot-password", errorName: error instanceof Error ? error.name : "UnknownError" }, "Password reset request failed");
    return next(error);
  }
});

router.post("/auth/reset-password", async (req, res, next) => {
  try {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (token.length < 32 || token.length > 200) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    }
    if (password.length < 10 || password.length > 200) {
      return res.status(400).json({ error: "Use a password between 10 and 200 characters." });
    }

    const tokenDigest = hashToken(token);
    const now = new Date();
    const [record] = await db.select({ id: passwordResetTokens.id, userId: passwordResetTokens.userId })
      .from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.tokenHash, tokenDigest), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now)))
      .limit(1);
    if (!record?.userId) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    }

    const newPasswordHash = await passwordHash(password);
    const didReset = await db.transaction(async (tx) => {
      const [claimed] = await tx.update(passwordResetTokens).set({ usedAt: new Date() })
        .where(and(eq(passwordResetTokens.id, record.id), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
        .returning({ userId: passwordResetTokens.userId });
      if (!claimed?.userId) return false;
      await tx.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, claimed.userId));
      await tx.delete(sessions).where(eq(sessions.userId, claimed.userId));
      return true;
    });

    if (!didReset) {
      return res.status(400).json({ error: "This reset link is invalid or has expired. Request a new one." });
    }
    clearSessionCookie(res);
    return res.json({ message: "Your password has been reset. You can now sign in with your new password." });
  } catch (error) {
    logger.error({ action: "reset-password", errorName: error instanceof Error ? error.name : "UnknownError" }, "Password reset failed");
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

export default router;
