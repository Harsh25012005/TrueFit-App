import { defineConfig } from 'drizzle-kit';

// Device SQLite migrations (`npm run db:local:generate`). Server migrations live in
// supabase/migrations and are written by hand (DATABASE.md §9).
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
