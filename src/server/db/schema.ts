import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/**
 * Everything the site stores about people. Kept deliberately small:
 * no IP addresses, no user agents, no names unless someone types one in a message.
 */

/** Pro waitlist. One row per email address, double opt-in. */
export const waitlist = pgTable(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lower-cased and trimmed. */
    email: text("email").notNull(),
    status: text("status", { enum: ["pending", "confirmed"] })
      .notNull()
      .default("pending"),
    /** SHA-256 of the confirmation token. The token itself only exists in the email. */
    confirmTokenHash: text("confirm_token_hash"),
    confirmExpiresAt: timestamp("confirm_expires_at", { withTimezone: true }),
    /** SHA-256 of the unsubscribe token sent with every email. */
    unsubscribeTokenHash: text("unsubscribe_token_hash").notNull(),
    /** Which wording of the consent text the person agreed to, and when. */
    consentVersion: text("consent_version").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    /** Limits how often a confirmation email can be re-sent to one address. */
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("waitlist_email_unique").on(table.email),
    index("waitlist_confirm_token_idx").on(table.confirmTokenHash),
    index("waitlist_unsubscribe_token_idx").on(table.unsubscribeTokenHash),
  ],
);

/** Requests for new shaders. The email is optional. */
export const shaderRequests = pgTable("shader_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  details: text("details").notNull(),
  referenceUrl: text("reference_url"),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Contact and feedback messages. The email is optional. */
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  topic: text("topic", { enum: ["feedback", "bug", "showcase", "licensing", "other"] }).notNull(),
  message: text("message").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schema = { waitlist, shaderRequests, messages };
