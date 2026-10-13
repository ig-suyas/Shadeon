import Link from "next/link";

/** Placeholder until the landing page is built in Phase 2. */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-start justify-center gap-4 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Shadeon</h1>
      <p className="text-text-muted">The landing page is built in Phase 2.</p>
      {process.env.NODE_ENV !== "production" ? (
        <Link href="/dev/playground" className="text-accent underline underline-offset-4">
          Open the engine playground
        </Link>
      ) : null}
    </main>
  );
}
