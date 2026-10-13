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
  /** Minimum age to use the forms. */
  minimumAge: 18,
  /** ISO date these texts last changed. */
  updated: "2026-10-14",
  /**
   * True until a qualified lawyer has reviewed the pages. While true, every
   * legal page shows a notice saying so.
   */
  draft: true,
} as const;

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
