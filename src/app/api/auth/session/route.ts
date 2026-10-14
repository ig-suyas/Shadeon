import { currentUser } from "@/server/session";

/**
 * Who is signed in, for the browser to choose what to show (the header link,
 * "sign in to see the code"). It decides nothing: every protected route
 * checks the session again itself. Never cached, never shared.
 */
export async function GET(): Promise<Response> {
  const user = await currentUser();
  return Response.json(user ? { signedIn: true, email: user.email } : { signedIn: false }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
