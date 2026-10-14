import { NextResponse, type NextRequest } from "next/server";
import { SHADER_IDS } from "@/shaders/ids";

const known = new Set(SHADER_IDS);

/**
 * Gives unknown shader URLs a real 404.
 *
 * The shader page streams (its id-dependent part sits in Suspense, and the root
 * loading.tsx is a Suspense boundary too), so once rendering starts the status
 * is already 200 and `notFound()` can only show the not-found page with a
 * noindex tag: a "soft 404". This runs before rendering, and rewrites unknown
 * ids to a path no route matches, which Next.js answers with the not-found
 * page and status 404. Known ids pass straight through to the static page.
 */
export function proxy(request: NextRequest): NextResponse {
  const id = request.nextUrl.pathname.slice("/shaders/".length);
  if (known.has(id)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_shader-not-found", request.url));
}

export const config = {
  // Only single-segment shader URLs; everything else never runs this.
  matcher: "/shaders/:id",
};
