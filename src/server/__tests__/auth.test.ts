// @vitest-environment node
import { createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { signUpSchema, resetPasswordSchema } from "@/lib/auth-schemas";
import { loginHref, safeNext } from "@/lib/auth-types";
import {
  changePassword,
  completeReset,
  completeSignup,
  countSessions,
  createSession,
  deleteAccount,
  deleteUserSessions,
  findUserById,
  purgeExpiredAuth,
  RESET_TTL_MS,
  SESSION_TTL_MS,
  sessionUser,
  SIGNUP_TTL_MS,
  signInWithGoogle,
  startReset,
  startSignup,
} from "../accounts";
import type { Database } from "../db/client";
import { authTokens, schema, sessions, users } from "../db/schema";
import { verifyGoogleIdToken } from "../google";
import { createInstallToken, INSTALL_TTL_SECONDS, verifyInstallToken } from "../install-token";
import { decodeOAuthState, encodeOAuthState } from "../oauth";
import { BCRYPT_COST, hashPassword, verifyPassword } from "../password";
import { createToken, hashToken } from "../tokens";

async function freshDatabase(): Promise<Database> {
  const db = drizzle(new PGlite(), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Database;
}

const now = new Date("2026-10-14T10:00:00Z");
const later = (ms: number): Date => new Date(now.getTime() + ms);

/** A cheap stand-in hash for database tests (bcrypt itself is tested below). */
const FAKE_HASH = "$2b$12$abcdefghijklmnopqrstuuabcdefghijklmnopqrstuvwxyzABCDE";

async function verifiedUser(db: Database, email: string): Promise<string> {
  const token = await startSignup(db, { email, passwordHash: FAKE_HASH, termsVersion: "t1" }, now);
  const result = await completeSignup(db, token, now);
  if (result.status !== "created") throw new Error("setup failed");
  return result.userId;
}

describe("passwords (bcrypt, cost 12)", () => {
  it("stores a salted bcrypt hash at cost 12, never the password", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toMatch(new RegExp(`^\\$2[aby]\\$${BCRYPT_COST}\\$`));
    expect(hash).not.toContain("correct horse");
    expect(await hashPassword("correct horse battery")).not.toBe(hash);
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterY", hash)).toBe(false);
  });

  it("refuses passwords bcrypt would silently cut short", async () => {
    const long = "a".repeat(73);
    await expect(hashPassword(long)).rejects.toThrow();
    const hash = await hashPassword("a".repeat(72));
    // Without the length check, 72 a's + anything would match this hash.
    expect(await verifyPassword(`${"a".repeat(72)}b`, hash)).toBe(false);
  });

  it("does the same work and says no when there is no stored hash", async () => {
    expect(await verifyPassword("anything at all", null)).toBe(false);
    expect(await verifyPassword("anything at all", undefined)).toBe(false);
  });
});

describe("sign-up and reset rules", () => {
  it("requires 12+ characters, at most 72 bytes, the consent box, and no email in the password", () => {
    const ok = { email: "ada@example.com", password: "a long passphrase", consent: "on" };
    expect(signUpSchema.safeParse(ok).success).toBe(true);
    expect(signUpSchema.safeParse({ ...ok, password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: "é".repeat(40) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: " ".repeat(14) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(
      signUpSchema.safeParse({ ...ok, email: "lovelace@example.com", password: "lovelace12345" })
        .success,
    ).toBe(false);
    const parsed = signUpSchema.parse({ ...ok, email: "  Ada@Example.COM " });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("checks that the new password was typed the same twice", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "a long passphrase", confirm: "a long passphrase" })
        .success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: "a long passphrase", confirm: "a long passphrasf" })
        .success,
    ).toBe(false);
  });
});

describe("redirect after sign-in (open redirect protection)", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/shaders/mesh-drift?speed=2")).toBe("/shaders/mesh-drift?speed=2");
    expect(safeNext("/account")).toBe("/account");
  });

  it("refuses everything that could leave the site or loop", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "/\t/evil.example",
      "javascript:alert(1)",
      "",
      null,
      42,
      "/login",
      "/signup?x=1",
      "/auth/google/callback",
      `/${"a".repeat(600)}`,
    ]) {
      expect(safeNext(value)).toBe("/shaders");
    }
    expect(loginHref("https://evil.example")).toBe("/login");
    expect(loginHref("/shaders/aurora-veil")).toBe("/login?next=%2Fshaders%2Faurora-veil");
  });
});

describe("accounts in the database", () => {
  let db: Database;
  beforeEach(async () => {
    db = await freshDatabase();
  });

  it("creates the account only when the email link is used, once", async () => {
    const token = await startSignup(
      db,
      { email: "ada@example.com", passwordHash: FAKE_HASH, termsVersion: "2026-10-14" },
      now,
    );
    expect(await db.select().from(users)).toHaveLength(0);
    const [pending] = await db.select().from(authTokens);
    expect(pending?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(pending)).not.toContain(token);

    const result = await completeSignup(db, token, now);
    expect(result.status).toBe("created");
    const [user] = await db.select().from(users);
    expect(user).toMatchObject({
      email: "ada@example.com",
      passwordHash: FAKE_HASH,
      termsVersion: "2026-10-14",
    });
    expect(user?.emailVerifiedAt).toEqual(now);
    expect(await completeSignup(db, token, now)).toEqual({ status: "invalid" });
  });

  it("refuses expired sign-up links and never changes an existing password", async () => {
    const expired = await startSignup(
      db,
      { email: "ada@example.com", passwordHash: FAKE_HASH, termsVersion: "t" },
      now,
    );
    expect(await completeSignup(db, expired, later(SIGNUP_TTL_MS + 1))).toEqual({
      status: "invalid",
    });

    await verifiedUser(db, "bob@example.com");
    const second = await startSignup(
      db,
      { email: "bob@example.com", passwordHash: "$2b$12$other", termsVersion: "t" },
      now,
    );
    expect(await completeSignup(db, second, now)).toEqual({ status: "exists" });
    const [bob] = await db.select().from(users).where(eq(users.email, "bob@example.com"));
    expect(bob?.passwordHash).toBe(FAKE_HASH);
  });

  it("sessions: hashed at rest, expire, and resolve only to their own user", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    const bob = await verifiedUser(db, "bob@example.com");
    const a = await createSession(db, ada, now);
    const b = await createSession(db, bob, now);
    const [row] = await db.select().from(sessions).where(eq(sessions.userId, ada));
    expect(row?.id).toBe(hashToken(a.token));
    expect(row?.id).not.toBe(a.token);

    expect((await sessionUser(db, a.token, now))?.id).toBe(ada);
    expect((await sessionUser(db, b.token, now))?.id).toBe(bob);
    expect(await sessionUser(db, createToken(), now)).toBeNull();
    expect(await sessionUser(db, a.token, later(SESSION_TTL_MS + 1))).toBeNull();
    // Nothing secret leaves the data layer.
    expect(Object.keys((await sessionUser(db, a.token, now)) ?? {})).not.toContain("passwordHash");
  });

  it("signs out everywhere, or everywhere else", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    const bob = await verifiedUser(db, "bob@example.com");
    const keep = await createSession(db, ada, now);
    await createSession(db, ada, now);
    await createSession(db, bob, now);
    const kept = await sessionUser(db, keep.token, now);
    await deleteUserSessions(db, ada, kept?.sessionId);
    expect(await countSessions(db, ada)).toBe(1);
    expect(await countSessions(db, bob)).toBe(1);
    await deleteUserSessions(db, ada);
    expect(await countSessions(db, ada)).toBe(0);
    expect(await countSessions(db, bob)).toBe(1);
  });

  it("password reset: one use, 30 minutes, ends every session, unknown address gives nothing", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    await createSession(db, ada, now);
    expect(await startReset(db, "nobody@example.com", now)).toBeNull();

    const stale = await startReset(db, "ada@example.com", now);
    const token = await startReset(db, "ada@example.com", now);
    expect(stale && (await completeReset(db, stale, "$2b$12$new", now))).toBeNull();
    expect(token && (await completeReset(db, token, "$2b$12$new", later(RESET_TTL_MS + 1)))).toBe(
      null,
    );

    const fresh = await startReset(db, "ada@example.com", now);
    expect(fresh && (await completeReset(db, fresh, "$2b$12$new", now))).toBe(ada);
    expect(fresh && (await completeReset(db, fresh, "$2b$12$again", now))).toBeNull();
    const [row] = await db.select().from(users).where(eq(users.id, ada));
    expect(row?.passwordHash).toBe("$2b$12$new");
    expect(await countSessions(db, ada)).toBe(0);
  });

  it("changing the password keeps only the current session", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    const current = await createSession(db, ada, now);
    await createSession(db, ada, now);
    const view = await sessionUser(db, current.token, now);
    await changePassword(db, ada, "$2b$12$changed", view!.sessionId, now);
    expect(await countSessions(db, ada)).toBe(1);
    expect(await sessionUser(db, current.token, now)).not.toBeNull();
  });

  it("Google: creates, links by verified address, and never takes over another Google link", async () => {
    const created = await signInWithGoogle(db, { sub: "111", email: "gina@example.com" }, "t", now);
    expect(created).toMatchObject({ status: "ok", created: true });
    const again = await signInWithGoogle(db, { sub: "111", email: "gina@example.com" }, "t", now);
    expect(again).toMatchObject({ status: "ok", created: false });
    expect(await db.select().from(users)).toHaveLength(1);

    const ada = await verifiedUser(db, "ada@example.com");
    const linked = await signInWithGoogle(db, { sub: "222", email: "ada@example.com" }, "t", now);
    expect(linked).toEqual({ status: "ok", userId: ada, created: false });
    expect((await findUserById(db, ada))?.hasGoogle).toBe(true);

    const other = await signInWithGoogle(db, { sub: "333", email: "ada@example.com" }, "t", now);
    expect(other).toEqual({ status: "conflict" });
  });

  it("a sign-up link adds a password to a Google-only account", async () => {
    const google = await signInWithGoogle(db, { sub: "111", email: "gina@example.com" }, "t", now);
    const token = await startSignup(
      db,
      { email: "gina@example.com", passwordHash: FAKE_HASH, termsVersion: "t" },
      now,
    );
    expect(await completeSignup(db, token, now)).toEqual({
      status: "created",
      userId: google.status === "ok" ? google.userId : "",
    });
    expect(await db.select().from(users)).toHaveLength(1);
  });

  it("deleting an account removes its rows and nobody else's", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    const bob = await verifiedUser(db, "bob@example.com");
    await createSession(db, ada, now);
    await createSession(db, bob, now);
    await startReset(db, "ada@example.com", now);
    await startReset(db, "bob@example.com", now);
    await startSignup(db, { email: "ada@example.com", passwordHash: FAKE_HASH, termsVersion: "t" });

    expect(await deleteAccount(db, ada)).toBe(true);
    expect(await findUserById(db, ada)).toBeNull();
    expect(await countSessions(db, ada)).toBe(0);
    const left = await db.select().from(authTokens);
    expect(left.map((row) => row.email)).toEqual(["bob@example.com"]);
    expect(await findUserById(db, bob)).not.toBeNull();
    expect(await countSessions(db, bob)).toBe(1);
    expect(await deleteAccount(db, ada)).toBe(false);
  });

  it("the retention purge removes expired sessions and links only", async () => {
    const ada = await verifiedUser(db, "ada@example.com");
    const live = await createSession(db, ada, later(SESSION_TTL_MS));
    await createSession(db, ada, now);
    await startReset(db, "ada@example.com", now);
    await purgeExpiredAuth(db, later(SESSION_TTL_MS + 1));
    expect(await countSessions(db, ada)).toBe(1);
    expect(await sessionUser(db, live.token, later(SESSION_TTL_MS + 1))).not.toBeNull();
    expect(await db.select().from(authTokens)).toHaveLength(0);
  });

  it("is not fooled by injection strings", async () => {
    for (const evil of ["' OR 1=1 --", "ada@example.com'; DROP TABLE users; --"]) {
      expect(await startReset(db, evil, now)).toBeNull();
      expect(await sessionUser(db, evil, now)).toBeNull();
    }
    expect(await db.select().from(users)).toHaveLength(0);
  });
});

describe("Google ID token verification", () => {
  const clientId = "123-abc.apps.googleusercontent.com";
  const nonce = createToken();
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keys = async (kid: string): Promise<KeyObject | null> => (kid === "k1" ? publicKey : null);
  const seconds = Math.floor(now.getTime() / 1000);

  const base = {
    iss: "https://accounts.google.com",
    aud: clientId,
    azp: clientId,
    sub: "1234567890",
    email: "Ada@Example.com",
    email_verified: true,
    iat: seconds - 10,
    exp: seconds + 3600,
    nonce,
  };

  const encode = (value: object): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  function token(
    claims: Record<string, unknown> = base,
    header: Record<string, unknown> = { alg: "RS256", kid: "k1", typ: "JWT" },
    key = privateKey,
  ): string {
    const input = `${encode(header)}.${encode(claims)}`;
    const signature = createSign("RSA-SHA256").update(input).sign(key).toString("base64url");
    return `${input}.${signature}`;
  }

  const check = (value: unknown, expectedNonce = nonce) =>
    verifyGoogleIdToken(value, { clientId, nonce: expectedNonce, now, keys });

  it("accepts a correctly signed token for this client and nonce", async () => {
    expect(await check(token())).toEqual({ sub: "1234567890", email: "ada@example.com" });
  });

  it("rejects forged, altered and mismatched tokens", async () => {
    const good = token();
    const [h, , s] = good.split(".");
    const cases: unknown[] = [
      token(base, { alg: "RS256", kid: "k1" }, other.privateKey), // wrong key
      `${h}.${encode({ ...base, sub: "999" })}.${s}`, // altered claims
      `${encode({ alg: "none", kid: "k1" })}.${encode(base)}.`, // alg none
      token(base, { alg: "HS256", kid: "k1" }), // other algorithm
      token(base, { alg: "RS256", kid: "unknown" }), // unknown key
      token({ ...base, aud: "someone-else.apps.googleusercontent.com" }),
      token({ ...base, azp: "someone-else" }),
      token({ ...base, iss: "https://evil.example" }),
      token({ ...base, exp: seconds - 120 }),
      token({ ...base, iat: seconds + 600 }),
      token({ ...base, email_verified: false }),
      token({ ...base, email_verified: "true" }),
      token({ ...base, nonce: undefined }),
      token({ ...base, sub: "../../etc" }),
      "not.a.token",
      "",
      null,
      "a".repeat(5000),
    ];
    for (const value of cases) expect(await check(value)).toBeNull();
    // Right token, but started by another browser (different nonce).
    expect(await check(good, createToken())).toBeNull();
  });
});

describe("Google sign-in state cookie", () => {
  it("round-trips and rejects anything malformed", () => {
    const value = { state: createToken(), nonce: createToken(), next: "/shaders/ink-smoke" };
    expect(decodeOAuthState(encodeOAuthState(value))).toEqual(value);
    for (const bad of [
      undefined,
      "",
      "a.b.c",
      `${createToken()}.${createToken()}`,
      "x".repeat(2000),
    ]) {
      expect(decodeOAuthState(bad)).toBeNull();
    }
  });
});

describe("shadcn install links", () => {
  const user = "3f2b8c1e-1d2a-4f5b-9c3d-2e1f0a9b8c7d";

  it("work for one shader, one account and one hour", () => {
    const token = createInstallToken("mesh-drift", user, now);
    expect(token).not.toBeNull();
    expect(verifyInstallToken(token, "mesh-drift", now)).toBe(user);
    expect(verifyInstallToken(token, "aurora-veil", now)).toBeNull();
    expect(
      verifyInstallToken(token, "mesh-drift", later((INSTALL_TTL_SECONDS + 1) * 1000)),
    ).toBeNull();
  });

  it("cannot be forged or re-pointed at another account", () => {
    const token = createInstallToken("mesh-drift", user, now)!;
    const [expires, , signature] = token.split(".");
    const otherUser = "00000000-0000-4000-8000-000000000000";
    expect(
      verifyInstallToken(`${expires}.${otherUser}.${signature}`, "mesh-drift", now),
    ).toBeNull();
    expect(verifyInstallToken(`9999999999.${user}.${signature}`, "mesh-drift", now)).toBeNull();
    for (const bad of [undefined, "", "abc", `${token}x`]) {
      expect(verifyInstallToken(bad, "mesh-drift", now)).toBeNull();
    }
  });
});
