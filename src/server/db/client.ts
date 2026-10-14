import "server-only";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { env, isProduction } from "../env";
import { schema } from "./schema";

export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** Longest a single production query may take. */
const QUERY_TIMEOUT_MS = 8000;

/**
 * One connection per server process. Next.js loads Server Actions, pages and
 * Route Handlers as separate module instances, so a module-level variable
 * would give each its own connection. With the embedded development database
 * that means several PGlite instances on one directory, each blind to the
 * others' writes (a session created by sign-in would be invisible to the
 * route that checks it). Keeping it on globalThis shares it.
 */
const shared = globalThis as typeof globalThis & {
  __shadeonDatabase?: Promise<Database | null> | null;
};

async function connect(): Promise<Database | null> {
  if (env.DATABASE_URL) {
    const [{ neon, neonConfig }, { drizzle }] = await Promise.all([
      import("@neondatabase/serverless"),
      import("drizzle-orm/neon-http"),
    ]);
    // Every query is one HTTP request; give up on it rather than hold the
    // function open if the database stops answering.
    neonConfig.fetchFunction = (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) });
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
  shared.__shadeonDatabase ??= connect().catch((error: unknown) => {
    shared.__shadeonDatabase = null;
    throw error;
  });
  return shared.__shadeonDatabase;
}
