/**
 * Form constants and the action result type. No validation library here, so
 * client components can import this file without pulling Zod into the browser.
 */

export const TOPICS = ["feedback", "bug", "showcase", "licensing", "other"] as const;

export const TOPIC_LABELS: Record<(typeof TOPICS)[number], string> = {
  feedback: "Feedback",
  bug: "Something is broken",
  showcase: "I built something with Shadeon",
  licensing: "Licensing question",
  other: "Something else",
};

export const LIMITS = {
  email: 254,
  title: 80,
  details: 2000,
  message: 4000,
  url: 300,
} as const;

/** What a form action returns to the page. */
export interface FormState {
  status: "idle" | "success" | "error";
  /** A message for the whole form (success text, or an error that is not about one field). */
  message?: string;
  /** Field name to error text. */
  errors?: Record<string, string>;
  /** Echo of text fields so nothing typed is lost after a failed submit. Never includes secrets. */
  values?: Record<string, string>;
}

export const IDLE: FormState = { status: "idle" };
