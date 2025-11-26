import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

if (!process.env.TURSO_CONNECTION_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/drizzle/schema.ts',
	dialect: 'turso',
	dbCredentials: {
		url: process.env.TURSO_CONNECTION_URL,
		authToken: process.env.TURSO_AUTH_TOKEN
	},
	verbose: true,
	strict: true
});
