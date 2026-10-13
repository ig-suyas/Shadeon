import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env, isProduction } from "../env";
import { schema } from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

let pending: Promise<Database | null> | null = null;

async function connect(): Promise<Database | null> {
  if (env.DATABASE_URL) {
    const [{ neon }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    return drizzle(neon(env.DATABASE_URL), { schema }) as unknown as Database;
  }
  // Production never falls back to a local file: forms report that they are unavailable.
  if (isProduction) return null;

  // Development and tests: an embedded Postgres (PGlite) with the same schema
  // and migrations, stored under .data/ so no account is needed to try the forms.
  const [{ PGlite }, { drizzle }, { migrate }, path, fs] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
    import("node:path"),
    import("node:fs/promises"),
  ]);
  let directory: string | undefined;
  if (env.NODE_ENV !== "test") {
    directory = path.join(process.cwd(), ".data", "pg");
    await fs.mkdir(path.dirname(directory), { recursive: true });
  }
  const client = new PGlite(directory);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}

/** The database, or null when none is configured in production. */
export function getDatabase(): Promise<Database | null> {
  pending ??= connect().catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}
