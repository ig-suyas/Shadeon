/**
 * Security events for monitoring: sign-ins, failures, password changes,
 * deletions. Only the event name and, where there is one, the account's
 * random id are written: never an email address, password, token or IP.
 */
export type AuthEvent =
  | "signup_requested"
  | "signup_completed"
  | "signin"
  | "signin_failed"
  | "signin_google"
  | "signin_google_failed"
  | "signout"
  | "signout_everywhere"
  | "reset_requested"
  | "reset_completed"
  | "password_changed"
  | "account_deleted";

export function authEvent(event: AuthEvent, userId?: string): void {
  console.info(`auth event: ${event}${userId ? ` user=${userId}` : ""}`);
}
