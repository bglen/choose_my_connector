import { json } from "@sveltejs/kit";
import { db } from "$lib/db";
import { accountSessions } from "$lib/drizzle/schema";
import { clearSessionCookie, getSessionAccount } from "$lib/server/auth";
import { eq } from "drizzle-orm";

export async function POST({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (session) {
    await db.delete(accountSessions).where(eq(accountSessions.tokenHash, session.tokenHash));
  }

  clearSessionCookie(cookies);
  return json({ ok: true });
}
