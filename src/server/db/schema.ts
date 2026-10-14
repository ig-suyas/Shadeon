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

/**
 * Accounts. A row exists only once the person has proved they own the email
 * address: by the link in the sign-up email, or by Google vouching for it.
 * There is no name, no profile and no IP address.
 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lower-cased and trimmed. */
    email: text("email").notNull(),
    /** bcrypt (cost 12). Null for accounts that only sign in with Google. */
    passwordHash: text("password_hash"),
    /** Google's stable account id ("sub"). Null until the account signs in with Google. */
    googleSub: text("google_sub"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }).notNull(),
    /** Which version of the Terms and Privacy Policy the person accepted, and when. */
    termsVersion: text("terms_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_google_sub_unique").on(table.googleSub),
  ],
);

/**
 * Signed-in browsers. The id is the SHA-256 of the cookie's random token, so a
 * copy of this table cannot be used to sign in.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

/**
 * One-time links sent by email. Only the SHA-256 of the token is stored.
 * - "signup": a pending account (email + bcrypt hash). The users row is
 *   created when the link is used, so unconfirmed sign-ups never become accounts.
 * - "reset": a password reset for an existing account.
 */
export const authTokens = pgTable(
  "auth_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    purpose: text("purpose", { enum: ["signup", "reset"] }).notNull(),
    /** Lower-cased. For "signup" the address being registered; for "reset" the account's. */
    email: text("email").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash"),
    termsVersion: text("terms_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("auth_tokens_email_idx").on(table.email),
    index("auth_tokens_user_idx").on(table.userId),
    index("auth_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const schema = { waitlist, shaderRequests, messages, users, sessions, authTokens };
