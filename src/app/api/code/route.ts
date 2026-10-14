import { canAccess } from "@/access/can-access";
import {
  EXPORT_TARGETS,
  generateExport,
  type ExportResult,
  type ExportTarget,
} from "@/export/generate";
import { installCommandFor } from "@/export/registry";
import { SITE_URL } from "@/lib/site";
import { loadFragment } from "@/shaders/loaders";
import { getShader } from "@/shaders/registry";
import { resolveSettings } from "@/shaders/settings";
import { isProduction } from "@/server/env";
import { createInstallToken } from "@/server/install-token";
import { logFailure } from "@/server/log";
import { withinLimit } from "@/server/rate-limit";
import { currentUser } from "@/server/session";

/**
 * The code for a shader, for signed-in visitors only. Everyone can see and
 * tune the live designs; the copy-ready React, JavaScript and GLSL files are
 * generated here, after the session is checked on the server.
 *
 * Request: POST {"id": "<shader id>", "settings": {...}} (JSON, same origin).
 * Settings pass through `resolveSettings`, which drops unknown keys and clamps
 * every value, so nothing from the request reaches the generated code as-is.
 */

const MAX_BODY_BYTES = 8 * 1024;

const NO_STORE = { "Cache-Control": "private, no-store" };

function fail(status: number, error: string): Response {
  return Response.json({ error }, { status, headers: NO_STORE });
}

/** Refuses cross-site callers outright (browsers also block them by CORS). */
function sameOrigin(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  try {
    const url = new URL(origin);
    return url.host === host || (isProduction && url.origin === SITE_URL);
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!sameOrigin(request)) return fail(403, "forbidden");
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return fail(415, "unsupported");
  }

  const user = await currentUser();
  if (!user) return fail(401, "sign-in-required");
  // Generous for someone dragging sliders; slow for anyone scraping.
  if (!(await withinLimit("code", user.id, { max: 600, windowSeconds: 600 }))) {
    return fail(429, "rate-limited");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail(413, "too-large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "invalid");
  }
  if (typeof body !== "object" || body === null) return fail(400, "invalid");
  const { id, settings } = body as { id?: unknown; settings?: unknown };
  const shader = typeof id === "string" ? getShader(id) : undefined;
  if (!shader) return fail(404, "unknown-shader");
  // Pro gating (off today) is decided by the one entitlement check.
  if (!canAccess(shader, "free")) return fail(403, "plan-required");

  try {
    const fragment = await loadFragment(shader.id);
    const resolved = resolveSettings(
      shader,
      typeof settings === "object" && settings !== null && !Array.isArray(settings)
        ? (settings as Record<string, unknown>)
        : undefined,
    );
    const exports = Object.fromEntries(
      EXPORT_TARGETS.map((target) => [
        target,
        generateExport({ meta: shader, fragment, settings: resolved }, target),
      ]),
    ) as Record<ExportTarget, ExportResult>;
    const token = createInstallToken(shader.id, user.id);
    return Response.json(
      { exports, install: token ? installCommandFor(shader, token) : null },
      { headers: NO_STORE },
    );
  } catch (error) {
    logFailure("code export", error);
    return fail(500, "failed");
  }
}
