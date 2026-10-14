// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it, vi } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "@/lib/security-headers";
import type { Database } from "../db/client";
import { schema } from "../db/schema";
import { describeError, logFailure } from "../log";
import { createMemoryStore, withinLimit } from "../rate-limit";
import {
  addMessage,
  addShaderRequest,
  confirmWaitlist,
  joinWaitlist,
  leaveWaitlist,
  purgeExpired,
} from "../repository";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("least-privilege database role (scripts/db-app-role.sql)", () => {
  async function asAppRole(): Promise<{ client: PGlite; db: Database }> {
    const client = new PGlite();
    const owner = drizzle(client, { schema });
    await migrate(owner, { migrationsFolder: path.join(process.cwd(), "drizzle") });
    await client.exec(readFileSync(path.join(process.cwd(), "scripts", "db-app-role.sql"), "utf8"));
    await client.exec("SET ROLE shadeon_app");
    return { client, db: owner as unknown as Database };
  }

  it("can do everything the site does", async () => {
    const { db } = await asAppRole();
    const mail = await joinWaitlist(db, "ada@example.com");
    expect(mail).not.toBeNull();
    expect(await confirmWaitlist(db, mail!.confirmToken)).toBe(true);
    expect(await leaveWaitlist(db, mail!.unsubscribeToken)).toBe(true);
    await addShaderRequest(db, { title: "Fog", details: "A soft rolling fog over water." });
    await addMessage(db, { topic: "feedback", message: "Lovely shaders." });
    await expect(purgeExpired(db)).resolves.toBeUndefined();
  });

  it("cannot drop, empty or create tables", async () => {
    const { client } = await asAppRole();
    await expect(client.exec("DROP TABLE waitlist")).rejects.toThrow();
    await expect(client.exec("TRUNCATE messages")).rejects.toThrow();
    await expect(client.exec("ALTER TABLE waitlist ADD COLUMN x text")).rejects.toThrow();
    await expect(client.exec("CREATE TABLE stolen (x text)")).rejects.toThrow();
  });

  it("cannot rewrite stored requests or messages", async () => {
    const { client } = await asAppRole();
    await expect(client.exec("UPDATE messages SET message = 'x'")).rejects.toThrow();
    await expect(client.exec("UPDATE shader_requests SET title = 'x'")).rejects.toThrow();
  });
});

describe("error logging", () => {
  it("never copies query parameters into the log", async () => {
    const db = drizzle(new PGlite(), { schema });
    const secret = "ada.lovelace@example.com";
    const error = await db.execute(sql`select ${secret}::uuid`).then(
      () => null,
      (caught: unknown) => caught,
    );
    expect(error).toBeInstanceOf(Error);
    // The raw message does contain the value: that is the leak being prevented.
    expect(String((error as Error).message)).toContain(secret);
    expect(describeError(error)).not.toContain(secret);
    expect(describeError(error)).toMatch(/database query failed/);

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logFailure("waitlist action", error);
    expect(log.mock.calls.flat().join(" ")).not.toContain(secret);
  });

  it("keeps useful detail for errors that carry no visitor data", () => {
    expect(describeError(new Error("The operation was aborted due to timeout"))).toContain(
      "timeout",
    );
    expect(describeError("text")).toBe("string");
  });

  it("logs rate-limit refusals by scope only", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = createMemoryStore();
    const subject = "203.0.113.7";
    for (let i = 0; i < 3; i++)
      await withinLimit("probe-scope", subject, { max: 2, windowSeconds: 60 }, store);
    const logged = warn.mock.calls.flat().join(" ");
    expect(logged).toContain("probe-scope");
    expect(logged).not.toContain(subject);
  });
});

describe("security headers", () => {
  const production = Object.fromEntries(securityHeaders(false).map((h) => [h.key, h.value]));

  it("sets the full header set", () => {
    expect(production["Strict-Transport-Security"]).toMatch(/max-age=\d{8}/);
    expect(production["X-Content-Type-Options"]).toBe("nosniff");
    expect(production["X-Frame-Options"]).toBe("DENY");
    expect(production["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(production["Permissions-Policy"]).toContain("camera=()");
    expect(production["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("keeps the production policy strict", () => {
    const csp = contentSecurityPolicy(false);
    for (const rule of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ]) {
      expect(csp).toContain(rule);
    }
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("ws:");
    expect(csp).not.toMatch(/(^|\s)\*(\s|;|$)/);
    expect(csp).not.toContain("vercel-scripts");
  });

  it("only loosens the policy in development", () => {
    expect(contentSecurityPolicy(true)).toContain("'unsafe-eval'");
    expect(contentSecurityPolicy(true)).not.toContain("upgrade-insecure-requests");
  });
});
