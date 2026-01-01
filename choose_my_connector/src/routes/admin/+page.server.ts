import { redirect } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { getSessionAccount } from "$lib/server/auth";

export async function load({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (!dev && !session?.account.isAdmin) {
    throw redirect(303, "/");
  }

  return { account: session?.account ?? null };
}
