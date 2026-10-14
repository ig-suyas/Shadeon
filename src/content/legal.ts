/**
 * Facts the legal pages depend on. Everything in square brackets is a
 * placeholder that must be replaced before launch; `npm run check:launch`
 * fails while any remain. Changing a value here updates every legal page.
 */
export const LEGAL = {
  /** The person or company that operates the site and is responsible for the data. */
  operator: "[Operator legal name]",
  /** Where privacy, legal and copyright requests are sent. */
  contactEmail: "[contact email address]",
  /** Postal address, if the applicable law requires one to be published. */
  postalAddress: "[Postal address, if required]",
  /** Country or state whose law governs the Terms, and whose courts hear disputes. */
  governingLaw: "[country or state]",
  /**
   * How long the database provider's backups (point-in-time history) keep
   * data, in days: deleted accounts stay in backups until then. Depends on the
   * Neon plan; set it to the configured window.
   */
  // Neon Free keeps 6 hours of history (checked 2026-10-14), so within a day.
  backupRetentionDays: "1",
  /** Minimum age to use the forms and to hold an account. */
  minimumAge: 18,
  /** ISO date these texts last changed. */
  updated: "2026-10-14",
  /**
   * True until a qualified lawyer has reviewed the pages. While true, every
   * legal page shows a notice saying so.
   */
  draft: true,
} as const;

/**
 * The version of the Terms and Privacy Policy a new account accepts, stored
 * with the account. It follows the date the texts last changed.
 */
export const TERMS_VERSION = LEGAL.updated;

/** How long data is kept. The server enforces these (see `purgeExpired`). */
export const RETENTION = {
  /** Waitlist addresses that were never confirmed. */
  unconfirmedWaitlistDays: 30,
  /** Shader requests and contact messages. */
  messagesMonths: 24,
} as const;

export const PLACEHOLDER = /\[[^\]]+\]/;

/** Legal values that still contain a placeholder. */
export function unresolvedLegalFields(): string[] {
  return Object.entries(LEGAL)
    .filter(([, value]) => typeof value === "string" && PLACEHOLDER.test(value))
    .map(([key]) => key);
}
