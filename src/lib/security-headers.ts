/**
 * Response headers for every route, applied in next.config.ts.
 *
 * The Content Security Policy does not use nonces: Next.js only supports them
 * with fully dynamic rendering, which would turn off the static and partially
 * prerendered pages this site depends on for speed. Inline scripts are
 * therefore allowed ('unsafe-inline'). The main defence against script
 * injection stays where it is: React escapes all text, and no visitor input is
 * ever rendered as HTML. The policy still blocks scripts and frames from other
 * origins (except Cloudflare Turnstile), plugins, <base> hijacking, posting
 * forms elsewhere, being framed, and sending data to other hosts.
 */

const TURNSTILE = "https://challenges.cloudflare.com";

export function contentSecurityPolicy(isDev: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Development only: React uses eval for error stacks, and the analytics
    // package loads its debug script from Vercel's CDN (in production it is
    // served from this origin).
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      TURNSTILE,
      ...(isDev ? ["'unsafe-eval'", "https://va.vercel-scripts.com"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    // Development needs the hot-reload socket.
    "connect-src": ["'self'", TURNSTILE, ...(isDev ? ["ws:"] : [])],
    "frame-src": [TURNSTILE],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    ...(isDev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([name, values]) => [name, ...values].join(" "))
    .join("; ");
}

export function securityHeaders(isDev: boolean): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(isDev) },
    // Two years. "preload" is left out: joining the browser preload list is a
    // commitment for the whole domain that the owner should make knowingly.
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
