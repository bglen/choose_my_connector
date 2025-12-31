import { json } from "@sveltejs/kit";
import { getSessionAccount } from "$lib/server/auth";

export async function GET({ cookies }) {
  const session = await getSessionAccount(cookies);

  if (!session) {
    return json({ account: null });
  }

  return json({ account: session.account });
}
