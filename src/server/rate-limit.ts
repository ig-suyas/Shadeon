import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { env } from "./env";
import { logFailure } from "./log";

/**
 * Fixed-window rate limiting. Keys are HMAC hashes, so no IP address or email
 * is ever stored. With Upstash configured the counters are shared by every
 * server instance; otherwise they live in this process's memory, which is
 * enough for local development and a single instance.
 */

export interface Limit {
  /** Requests allowed per window. */
  max: number;
  windowSeconds: number;
}

export interface RateStore {
  /** Adds one to the counter and returns the new count. */
  hit(key: string, windowSeconds: number): Promise<number>;
}

// Without a configured salt, hashes are only stable until the next restart, which is fine.
const salt = env.RATE_LIMIT_SALT ?? randomBytes(32).toString("hex");

export function rateKey(scope: string, subject: string): string {
  return `rl:${scope}:${createHmac("sha256", salt).update(subject).digest("hex").slice(0, 32)}`;
}

export function createMemoryStore(now: () => number = Date.now): RateStore {
  const counters = new Map<string, { count: number; resetAt: number }>();
  return {
    async hit(key, windowSeconds) {
      const time = now();
      // Opportunistic cleanup keeps the map from growing without bound.
      if (counters.size > 5000) {
        for (const [name, entry] of counters) if (entry.resetAt <= time) counters.delete(name);
      }
      const entry = counters.get(key);
      if (!entry || entry.resetAt <= time) {
        counters.set(key, { count: 1, resetAt: time + windowSeconds * 1000 });
        return 1;
      }
      entry.count += 1;
      return entry.count;
    },
  };
}

function createUpstashStore(url: string, token: string): RateStore {
  return {
    async hit(key, windowSeconds) {
      // INCR, then set the expiry only if the key has none (NX), in one round trip.
      const response = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, String(windowSeconds), "NX"],
        ]),
        signal: AbortSignal.timeout(2500),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`rate limit store answered ${response.status}`);
      const [first] = (await response.json()) as [{ result?: unknown }];
      if (typeof first?.result !== "number") throw new Error("unexpected rate limit store reply");
      return first.result;
    },
  };
}

// One counter set per process (Next.js loads actions and routes as separate
// module instances; a per-module store would split every limit between them).
const shared = globalThis as typeof globalThis & { __shadeonRateMemory?: RateStore };
const memory = (shared.__shadeonRateMemory ??= createMemoryStore());
const remote =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createUpstashStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN)
    : null;

/** Records a refusal for monitoring: the scope only, never who was refused. */
function refuse(scope: string): false {
  console.warn(`rate limit reached: ${scope}`);
  return false;
}

/**
 * True when the request is within the limit. If the shared store cannot be
 * reached, the in-memory counter still applies, so the check never fails open.
 */
export async function withinLimit(
  scope: string,
  subject: string,
  limit: Limit,
  store: RateStore | null = remote,
): Promise<boolean> {
  const key = rateKey(scope, subject);
  const local = await memory.hit(key, limit.windowSeconds);
  if (local > limit.max) return refuse(scope);
  if (!store) return true;
  try {
    return (await store.hit(key, limit.windowSeconds)) <= limit.max || refuse(scope);
  } catch (error) {
    logFailure("rate limit store", error);
    return true; // the in-memory counter above already allowed this request
  }
}
