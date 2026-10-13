import { z } from "zod";
import { LIMITS, TOPICS } from "./form-types";

export { IDLE, LIMITS, TOPIC_LABELS, TOPICS, type FormState } from "./form-types";

/**
 * Validation for every form, used by the server actions. The browser only
 * gets native HTML constraints as a convenience; these schemas are the rule.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(LIMITS.email, "That email address is too long.")
  .email("Enter a valid email address, like name@example.com.");

/** Empty strings from untouched optional inputs become undefined. */
const optional = <T extends z.ZodType>(inner: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    inner.optional(),
  );

export const waitlistSchema = z.object({
  email,
  consent: z.literal("on", { error: "Tick the box so we know you want this email." }),
});

export const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Give the shader a short name, at least 3 characters.")
    .max(LIMITS.title, `Keep the name under ${LIMITS.title} characters.`),
  details: z
    .string()
    .trim()
    .min(20, "Describe the look in at least 20 characters.")
    .max(LIMITS.details, `Keep the description under ${LIMITS.details} characters.`),
  referenceUrl: optional(
    z
      .string()
      .trim()
      .max(LIMITS.url, "That link is too long.")
      .url("Enter a full link starting with https://")
      .refine((value) => /^https?:\/\//i.test(value), "Enter a full link starting with https://"),
  ),
  email: optional(email),
});

export const contactSchema = z.object({
  topic: z.enum(TOPICS, { error: "Choose a topic." }),
  message: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters.")
    .max(LIMITS.message, `Keep the message under ${LIMITS.message} characters.`),
  email: optional(email),
});

/** First error message per field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}
