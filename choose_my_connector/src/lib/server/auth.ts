import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import type { Cookies } from "@sveltejs/kit";
import { db } from "$lib/db";
import { accounts, accountSessions } from "$lib/drizzle/schema";

const scryptAsync = promisify(scrypt);
const SESSION_COOKIE = "cmc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type SessionAccount = {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;

  return {
    salt: salt.toString("base64"),
    hash: derived.toString("base64")
  };
}

export async function verifyPassword(password: string, saltBase64: string, hashBase64: string) {
  const salt = Buffer.from(saltBase64, "base64");
  const expected = Buffer.from(hashBase64, "base64");
  const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(expected, derived);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("base64");
}

export async function createSession(accountId: number) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(accountSessions).values({
    accountId,
    tokenHash,
    expiresAt
  });

  return { token, expiresAt };
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date) {
  cookies.set(SESSION_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt
  });
}

export function clearSessionCookie(cookies: Cookies) {
  cookies.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0)
  });
}

export async function getSessionAccount(cookies: Cookies) {
  const token = cookies.get(SESSION_COOKIE);
  if (!token || typeof token !== "string") return null;

  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const [session] = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      displayName: accounts.displayName,
      avatarUrl: accounts.avatarUrl,
      isAdmin: accounts.isAdmin,
      expiresAt: accountSessions.expiresAt
    })
    .from(accountSessions)
    .innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .where(and(eq(accountSessions.tokenHash, tokenHash), gt(accountSessions.expiresAt, now)))
    .limit(1);

  if (!session) return null;

  return {
    account: {
      id: session.id,
      email: session.email,
      displayName: session.displayName ?? null,
      avatarUrl: session.avatarUrl ?? null,
      isAdmin: session.isAdmin
    },
    tokenHash
  };
}

export async function findAccountByEmail(email: string) {
  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);
  return account ?? null;
}
