import { json } from "@sveltejs/kit";
import { and, eq, ne } from "drizzle-orm";
import { db } from "$lib/db";
import { accountSessions, accounts } from "$lib/drizzle/schema";
import { clearSessionCookie, getSessionAccount, normalizeEmail } from "$lib/server/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function splitName(fullName: string | null) {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");
  return { firstName, lastName };
}

function toIsoDate(value: Date | string | number | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : value.toISOString();
  }
  const numeric = typeof value === "bigint" ? Number(value) : value;
  const parsed = new Date(numeric);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toProfile(account: {
  id: number;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: Date | string | number | null;
}) {
  const { firstName, lastName } = splitName(account.displayName);
  return {
    id: account.id,
    email: account.email,
    displayName: account.displayName,
    firstName,
    lastName,
    isAdmin: account.isAdmin,
    createdAt: toIsoDate(account.createdAt)
  };
}

export async function GET({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (!session?.account) {
    return json({ error: "Not authenticated." }, { status: 401 });
  }

  const [account] = await db
    .select({
      id: accounts.id,
      email: accounts.email,
      displayName: accounts.displayName,
      isAdmin: accounts.isAdmin,
      createdAt: accounts.createdAt
    })
    .from(accounts)
    .where(eq(accounts.id, session.account.id))
    .limit(1);

  if (!account) {
    return json({ error: "Account not found." }, { status: 404 });
  }

  return json({ account: toProfile(account) });
}

export async function PATCH({ request, cookies }) {
  const session = await getSessionAccount(cookies);

  if (!session?.account) {
    return json({ error: "Not authenticated." }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse account update payload", error);
    return json({ error: "Invalid request body." }, { status: 400 });
  }

  const firstName = clean(payload.firstName);
  const lastName = clean(payload.lastName);
  const email = normalizeEmail(clean(payload.email));
  const isAdmin = Boolean(payload.isAdmin);

  if (!email) {
    return json({ error: "Email is required." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const [existingEmail] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.email, email), ne(accounts.id, session.account.id)))
    .limit(1);

  if (existingEmail) {
    return json({ error: "That email is already in use by another account." }, { status: 409 });
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];

  const updatePayload: Partial<typeof accounts.$inferInsert> = {
    email,
    displayName
  };

  if (session.account.isAdmin) {
    updatePayload.isAdmin = isAdmin;
  }

  const [updated] = await db
    .update(accounts)
    .set(updatePayload)
    .where(eq(accounts.id, session.account.id))
    .returning({
      id: accounts.id,
      email: accounts.email,
      displayName: accounts.displayName,
      isAdmin: accounts.isAdmin,
      createdAt: accounts.createdAt
    });

  if (!updated) {
    return json({ error: "Unable to update account." }, { status: 500 });
  }

  return json({ account: toProfile(updated) });
}

export async function DELETE({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (!session?.account) {
    return json({ error: "Not authenticated." }, { status: 401 });
  }

  await db.delete(accounts).where(eq(accounts.id, session.account.id));
  await db.delete(accountSessions).where(eq(accountSessions.accountId, session.account.id));
  clearSessionCookie(cookies);

  return json({ ok: true });
}
