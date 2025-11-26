// src/lib/db.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

// Helper to safely attempt loading SvelteKit's $env modules
async function tryLoadKitEnv() {
  try {
    const env = await import('$env/static/private');
    return {
      url: env.TURSO_CONNECTION_URL,
      auth: env.TURSO_AUTH_TOKEN
    };
  } catch {
    return { url: undefined, auth: undefined };
  }
}

const kitEnv = await tryLoadKitEnv();

const url =
  kitEnv.url ||
  process.env.TURSO_CONNECTION_URL ||
  undefined;

const auth =
  kitEnv.auth ||
  process.env.TURSO_AUTH_TOKEN ||
  undefined;

if (!url) throw new Error("Missing TURSO_CONNECTION_URL.");
if (!auth) throw new Error("Missing TURSO_AUTH_TOKEN.");

export const db = drizzle(createClient({ url, authToken: auth }));