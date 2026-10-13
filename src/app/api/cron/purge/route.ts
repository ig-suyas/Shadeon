import { timingSafeEqual } from "node:crypto";
import { getDatabase } from "@/server/db/client";
import { env } from "@/server/env";
import { purgeExpired } from "@/server/repository";

/**
 * Daily retention job (see vercel.json). Deletes data that has passed the
 * periods promised in the Privacy Policy, even on days when nobody submits a
 * form. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`; without a
 * configured secret, or with the wrong one, the route does nothing.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  const authorised =
    Boolean(secret) &&
    given.length === expected.length &&
    timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!authorised) return new Response("Not found", { status: 404 });

  try {
    const db = await getDatabase();
    if (!db) return Response.json({ ok: false, reason: "no database" }, { status: 503 });
    await purgeExpired(db);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("retention cron failed:", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
