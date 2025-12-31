import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { accounts } from "$lib/drizzle/schema";
import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  verifyPassword
} from "$lib/server/auth";
import { eq } from "drizzle-orm";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST({ request, cookies }) {
  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse login payload", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = normalizeEmail(clean(payload.email));
  const password = clean(payload.password);

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  const [account] = await db.select().from(accounts).where(eq(accounts.email, email)).limit(1);

  if (!account) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, account.passwordSalt, account.passwordHash);

  if (!validPassword) {
    return json({ error: "Invalid email or password." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(account.id);
  setSessionCookie(cookies, token, expiresAt);

  await db.update(accounts).set({ lastLoginAt: new Date() }).where(eq(accounts.id, account.id));

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
