import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes SQL migrations to ./drizzle from the schema.
// `npm run db:migrate` applies them as the database owner: DATABASE_MIGRATION_URL
// when set (production, see scripts/db-app-role.sql), else Neon's direct
// connection DATABASE_URL_UNPOOLED (written by `neon env pull`), else DATABASE_URL.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_MIGRATION_URL ??
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      "postgres://localhost/unused",
  },
});
