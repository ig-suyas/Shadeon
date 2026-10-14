import type { NextRequest } from "next/server";
import { canAccess } from "@/access/can-access";
import { registryIndex, registryItem } from "@/export/registry";
import { loadFragment } from "@/shaders/loaders";
import { getShader, shaders } from "@/shaders/registry";
import { findUserById } from "@/server/accounts";
import { getDatabase } from "@/server/db/client";
import { verifyInstallToken } from "@/server/install-token";
import { logFailure } from "@/server/log";
import { withinLimit } from "@/server/rate-limit";

/**
 * The shadcn registry, for `npx shadcn@latest add <url>`.
 *
 * - /r/index.json lists names and descriptions only (no code): public.
 * - /r/<id>.json?token=... returns the component. The token comes from a
 *   signed-in visitor's code panel and works for one hour, for that shader.
 *   The account must still exist. Anything else answers 401 with no code.
 */

const PRIVATE = { "Cache-Control": "private, no-store" };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  if (file === "index.json") {
    return Response.json(registryIndex(shaders.filter((shader) => canAccess(shader, "free"))), {
      headers: { "Cache-Control": "public, max-age=300" },
    });
  }

  const id = /^([a-z0-9-]{1,64})\.json$/.exec(file)?.[1];
  const shader = id ? getShader(id) : undefined;
  if (!shader) return Response.json({ error: "not found" }, { status: 404, headers: PRIVATE });

  const userId = verifyInstallToken(request.nextUrl.searchParams.get("token"), shader.id);
  if (!userId) {
    return Response.json(
      { error: "Sign in on the shader's page and copy a fresh install command." },
      { status: 401, headers: PRIVATE },
    );
  }
  if (!(await withinLimit("registry", userId, { max: 60, windowSeconds: 600 }))) {
    return Response.json({ error: "Too many requests." }, { status: 429, headers: PRIVATE });
  }

  try {
    const db = await getDatabase();
    // A deleted account's links stop working at once.
    if (!db || !(await findUserById(db, userId))) {
      return Response.json({ error: "Sign in again." }, { status: 401, headers: PRIVATE });
    }
    if (!canAccess(shader, "free")) {
      return Response.json({ error: "plan required" }, { status: 403, headers: PRIVATE });
    }
    return Response.json(registryItem(shader, await loadFragment(shader.id)), { headers: PRIVATE });
  } catch (error) {
    logFailure("registry", error);
    return Response.json({ error: "failed" }, { status: 500, headers: PRIVATE });
  }
}
