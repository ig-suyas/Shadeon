// @vitest-environment node
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { contactSchema, fieldErrors, requestSchema, waitlistSchema } from "@/lib/forms";
import type { Database } from "../db/client";
import { messages, schema, shaderRequests, waitlist } from "../db/schema";
import { createMemoryStore, rateKey, withinLimit } from "../rate-limit";
import {
  addMessage,
  addShaderRequest,
  confirmWaitlist,
  joinWaitlist,
  leaveWaitlist,
} from "../repository";
import { createToken, hashToken, isTokenShaped } from "../tokens";

async function freshDatabase(): Promise<Database> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe("tokens", () => {
  it("creates long, unique, URL-safe tokens", () => {
    const a = createToken();
    const b = createToken();
    expect(a).not.toBe(b);
    expect(isTokenShaped(a)).toBe(true);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
  });

  it("rejects anything that is not token shaped", () => {
    for (const value of ["", "short", "a".repeat(44), "../../etc/passwd", null, 42, undefined]) {
      expect(isTokenShaped(value)).toBe(false);
    }
  });
});

describe("waitlist", () => {
  let db: Database;
  const now = new Date("2026-10-14T10:00:00Z");

  beforeEach(async () => {
    db = await freshDatabase();
  });

  it("stores a pending row with hashed tokens and the consent record", async () => {
    const mail = await joinWaitlist(db, "ada@example.com", now);
    expect(mail).not.toBeNull();
    const [row] = await db.select().from(waitlist);
    expect(row).toMatchObject({ email: "ada@example.com", status: "pending" });
    expect(row?.consentVersion).toBeTruthy();
    expect(row?.consentAt.getTime()).toBe(now.getTime());
    // Only hashes are stored.
    expect(row?.confirmTokenHash).toBe(hashToken(mail?.confirmToken ?? ""));
    expect(JSON.stringify(row)).not.toContain(mail?.confirmToken);
    expect(JSON.stringify(row)).not.toContain(mail?.unsubscribeToken);
  });

  it("confirms once with the right token", async () => {
    const mail = await joinWaitlist(db, "ada@example.com", now);
    const token = mail?.confirmToken ?? "";
    expect(await confirmWaitlist(db, createToken(), now)).toBe(false);
    expect(await confirmWaitlist(db, token, now)).toBe(true);
    expect(await confirmWaitlist(db, token, now)).toBe(false);
    const [row] = await db.select().from(waitlist);
    expect(row).toMatchObject({ status: "confirmed", confirmTokenHash: null });
  });

  it("refuses an expired confirmation link", async () => {
    const mail = await joinWaitlist(db, "ada@example.com", now);
    const later = new Date(now.getTime() + 8 * DAY);
    expect(await confirmWaitlist(db, mail?.confirmToken ?? "", later)).toBe(false);
  });

  it("does not re-send within ten minutes, and issues a new link after that", async () => {
    const first = await joinWaitlist(db, "ada@example.com", now);
    const soon = new Date(now.getTime() + 5 * MINUTE);
    expect(await joinWaitlist(db, "ada@example.com", soon)).toBeNull();
    const again = await joinWaitlist(db, "ada@example.com", new Date(now.getTime() + 11 * MINUTE));
    expect(again).not.toBeNull();
    expect(await db.select().from(waitlist)).toHaveLength(1);
    // The old link stops working; the new one works.
    const later = new Date(now.getTime() + 12 * MINUTE);
    expect(await confirmWaitlist(db, first?.confirmToken ?? "", later)).toBe(false);
    expect(await confirmWaitlist(db, again?.confirmToken ?? "", later)).toBe(true);
  });

  it("sends nothing for an address that is already confirmed", async () => {
    const mail = await joinWaitlist(db, "ada@example.com", now);
    await confirmWaitlist(db, mail?.confirmToken ?? "", now);
    expect(await joinWaitlist(db, "ada@example.com", new Date(now.getTime() + DAY))).toBeNull();
    const [row] = await db.select().from(waitlist);
    expect(row?.status).toBe("confirmed");
  });

  it("keeps one row when the same address signs up twice at once", async () => {
    await Promise.all([
      joinWaitlist(db, "ada@example.com", now),
      joinWaitlist(db, "ada@example.com", now),
    ]);
    expect(await db.select().from(waitlist)).toHaveLength(1);
  });

  it("deletes the row on unsubscribe, and only that row", async () => {
    const ada = await joinWaitlist(db, "ada@example.com", now);
    await joinWaitlist(db, "grace@example.com", now);
    expect(await leaveWaitlist(db, createToken())).toBe(false);
    expect(await leaveWaitlist(db, ada?.unsubscribeToken ?? "")).toBe(true);
    const rows = await db.select().from(waitlist);
    expect(rows.map((row) => row.email)).toEqual(["grace@example.com"]);
    expect(await leaveWaitlist(db, ada?.unsubscribeToken ?? "")).toBe(false);
  });

  it("is not injectable through the email or the token", async () => {
    const hostile = "x'; DROP TABLE waitlist; --@example.com";
    await joinWaitlist(db, hostile, now);
    expect(await leaveWaitlist(db, "' OR '1'='1")).toBe(false);
    const rows = await db.select().from(waitlist);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe(hostile);
  });
});

describe("requests and messages", () => {
  it("stores a request with and without the optional fields", async () => {
    const db = await freshDatabase();
    await addShaderRequest(db, {
      title: "Caustics",
      details: "Light through water on a pool floor.",
    });
    await addShaderRequest(db, {
      title: "Ink",
      details: "Ink spreading in water, slow.",
      referenceUrl: "https://example.com/ink",
      email: "ada@example.com",
    });
    const rows = await db.select().from(shaderRequests);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.title === "Caustics")).toMatchObject({
      email: null,
      referenceUrl: null,
    });
  });

  it("stores a message", async () => {
    const db = await freshDatabase();
    await addMessage(db, { topic: "bug", message: "The preview is blank on my tablet." });
    const [row] = await db.select().from(messages);
    expect(row).toMatchObject({ topic: "bug", email: null });
  });
});

describe("form validation", () => {
  it("normalises a good waitlist entry", () => {
    const result = waitlistSchema.safeParse({ email: "  Ada@Example.COM ", consent: "on" });
    expect(result.success && result.data.email).toBe("ada@example.com");
  });

  it("requires consent and a real email", () => {
    const noConsent = waitlistSchema.safeParse({ email: "ada@example.com", consent: null });
    expect(noConsent.success).toBe(false);
    if (!noConsent.success) expect(fieldErrors(noConsent.error)).toHaveProperty("consent");
    for (const email of ["", "ada", "ada@", "@example.com", `${"a".repeat(260)}@example.com`]) {
      expect(waitlistSchema.safeParse({ email, consent: "on" }).success).toBe(false);
    }
  });

  it("treats empty optional fields as absent", () => {
    const result = requestSchema.safeParse({
      title: "Caustics",
      details: "Light through water on a pool floor.",
      referenceUrl: "  ",
      email: "",
    });
    expect(result.success && result.data).toEqual({
      title: "Caustics",
      details: "Light through water on a pool floor.",
    });
  });

  it("rejects short, oversized and non-http input", () => {
    const base = { title: "Caustics", details: "Light through water on a pool floor." };
    const bad = (extra: Record<string, string>): boolean =>
      requestSchema.safeParse({ ...base, ...extra }).success;
    expect(bad({ title: "a" })).toBe(false);
    expect(bad({ details: "x".repeat(2001) })).toBe(false);
    expect(bad({ referenceUrl: "javascript:alert(1)" })).toBe(false);
    expect(bad({ referenceUrl: "ftp://example.com/a" })).toBe(false);
    expect(bad({ email: "nope" })).toBe(false);
    expect(contactSchema.safeParse({ topic: "admin", message: "A valid message." }).success).toBe(
      false,
    );
    expect(contactSchema.safeParse({ topic: "bug", message: "short" }).success).toBe(false);
    expect(contactSchema.safeParse({ topic: "bug", message: "x".repeat(4001) }).success).toBe(
      false,
    );
  });

  it("reports one message per field", () => {
    const result = contactSchema.safeParse({ topic: "", message: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(fieldErrors(result.error)).sort()).toEqual(["message", "topic"]);
    }
  });
});

describe("rate limiting", () => {
  it("hashes subjects so raw values are never in a key", () => {
    const key = rateKey("waitlist", "203.0.113.7");
    expect(key).toMatch(/^rl:waitlist:[0-9a-f]{32}$/);
    expect(key).not.toContain("203.0.113.7");
    expect(rateKey("waitlist", "203.0.113.7")).toBe(key);
    expect(rateKey("contact", "203.0.113.7")).not.toBe(key);
  });

  it("counts within a window and resets after it", async () => {
    let time = 1_000_000;
    const store = createMemoryStore(() => time);
    expect(await store.hit("k", 60)).toBe(1);
    expect(await store.hit("k", 60)).toBe(2);
    time += 61_000;
    expect(await store.hit("k", 60)).toBe(1);
  });

  it("allows up to the limit, then blocks", async () => {
    const subject = `test-${Math.random()}`;
    const limit = { max: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await withinLimit("unit", subject, limit, null));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("still enforces the local limit when the shared store is down", async () => {
    const subject = `down-${Math.random()}`;
    const broken = {
      hit: async (): Promise<number> => {
        throw new Error("network");
      },
    };
    const limit = { max: 2, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await withinLimit("unit", subject, limit, broken));
    expect(results).toEqual([true, true, false, false]);
  });

  it("blocks when the shared store reports a higher count", async () => {
    const subject = `shared-${Math.random()}`;
    const busy = { hit: async (): Promise<number> => 99 };
    expect(await withinLimit("unit", subject, { max: 5, windowSeconds: 60 }, busy)).toBe(false);
  });
});
