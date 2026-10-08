import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, sessions, users } from "@workspace/db";

const SESSION_COOKIE = "homza_session";
const SESSION_DAYS = 7;

export type HomzaRole = "tenant" | "owner" | "admin";
export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: HomzaRole;
  phone: string | null;
  ownerVerificationStatus: "unverified" | "pending" | "verified" | "rejected";
};

declare global {
  namespace Express {
    interface Request {
      homzaUser?: AuthenticatedUser;
    }
  }
}

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function passwordHash(password: string, salt = randomBytes(16).toString("hex")): Promise<string> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${key.toString("hex")}`);
    });
  });
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) {
    return false;
  }
  const actual = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(key as Buffer);
    });
  });
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || token.length < 32) {
      return res.status(401).json({ error: "Sign in to continue" });
    }

    const [record] = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        phone: users.phone,
        ownerVerificationStatus: users.ownerVerificationStatus,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
      .limit(1);

    if (!record) {
      clearSessionCookie(res);
      return res.status(401).json({ error: "Your session has expired. Please sign in again." });
    }

    req.homzaUser = record as AuthenticatedUser;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(...allowed: HomzaRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.homzaUser) return res.status(401).json({ error: "Sign in to continue" });
    if (!allowed.includes(req.homzaUser.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action" });
    }
    return next();
  };
}
