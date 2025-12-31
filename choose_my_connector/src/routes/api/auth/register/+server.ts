import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { accounts } from "$lib/drizzle/schema";
import {
  createSession,
  hashPassword,
  normalizeEmail,
  setSessionCookie
} from "$lib/server/auth";
import { eq } from "drizzle-orm";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST({ request, cookies }) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse account payload", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(clean(payload.email));
  const password = clean(payload.password);
  const displayName = clean(payload.displayName);
  const avatarUrl = clean(payload.avatarUrl);
  const isAdmin = Boolean(payload.isAdmin);

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return json({ error: "Use a password with at least 8 characters." }, { status: 400 });
  }

  const existing = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.email, email)).limit(1);

  if (existing.length) {
    return json({ error: "An account already exists for that email." }, { status: 409 });
  }

  const { hash, salt } = await hashPassword(password);

  const [account] = await db
    .insert(accounts)
    .values({
      email,
      displayName: displayName || email.split("@")[0],
      avatarUrl: avatarUrl || undefined,
      passwordHash: hash,
      passwordSalt: salt,
      isAdmin
    })
    .returning();

  if (!account) {
    return json({ error: "Could not create account." }, { status: 500 });
  }

  const { token, expiresAt } = await createSession(account.id);
  setSessionCookie(cookies, token, expiresAt);

  return json({
    account: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      isAdmin: account.isAdmin
    }
  });
}
