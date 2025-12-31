import { redirect } from "@sveltejs/kit";
import { getSessionAccount } from "$lib/server/auth";

export async function load({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (!session?.account.isAdmin) {
    throw redirect(303, "/");
  }

  return { account: session.account };
}
