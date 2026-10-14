/**
 * Server error logging that never writes personal data.
 *
 * Database errors are the trap: Drizzle's query error puts the SQL *and its
 * parameters* in the message, so logging `error.message` would copy email
 * addresses, message text and token hashes into the hosting provider's logs.
 * This keeps only the error's name and, for database errors, the Postgres
 * error code (for example 23505 for a unique violation), which is enough to
 * diagnose a failure.
 */

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return typeof error;
  const isQueryError = "params" in error || "query" in error;
  if (isQueryError) {
    const cause = error.cause;
    const code = field(cause, "code");
    const name = cause instanceof Error ? cause.name : "unknown cause";
    return `database query failed (${name}${typeof code === "string" ? `, code ${code}` : ""})`;
  }
  // A Postgres error that reached us unwrapped: its message can quote values.
  const code = field(error, "code");
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
    return `${error.name}, code ${code}`;
  }
  // Other errors (network timeouts, aborted fetches) carry no visitor data.
  return `${error.name}: ${error.message.slice(0, 200)}`;
}

export function logFailure(scope: string, error: unknown): void {
  console.error(`${scope} failed: ${describeError(error)}`);
}
