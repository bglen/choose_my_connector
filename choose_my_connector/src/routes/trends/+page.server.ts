import type { PageServerLoad } from "./$types";
import { getSessionAccount } from "$lib/server/auth";

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await getSessionAccount(cookies);
  return { account: session?.account ?? null };
};
