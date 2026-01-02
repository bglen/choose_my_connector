import type { PageServerLoad } from "./$types";
import { db } from "$lib/db";
import { accounts } from "$lib/drizzle/schema";
import { getSessionAccount } from "$lib/server/auth";
import { eq } from "drizzle-orm";

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

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await getSessionAccount(cookies);

  if (!session?.account) {
    return {
      sessionAccount: null,
      profile: null
    };
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
    return {
      sessionAccount: null,
      profile: null
    };
  }

  const { firstName, lastName } = splitName(account.displayName);

  return {
    sessionAccount: session.account,
    profile: {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      firstName,
      lastName,
      isAdmin: account.isAdmin,
      createdAt: toIsoDate(account.createdAt)
    }
  };
};
