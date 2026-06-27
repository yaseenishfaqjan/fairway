import { defineConfig } from 'drizzle-kit';

// drizzle-kit only needs the dialect to *generate* SQL migrations from the schema.
// Generation does not require a live database connection.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/fairway360',
  },
});
