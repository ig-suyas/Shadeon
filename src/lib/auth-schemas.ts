import { z } from "zod";
import { PASSWORD } from "./auth-types";
import { LIMITS } from "./form-types";

/**
 * Validation for the account forms, used by the server actions. The browser
 * only gets native HTML constraints as a convenience; these are the rule.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Enter your email address.")
  .max(LIMITS.email, "That email address is too long.")
  .email("Enter a valid email address, like name@example.com.");

/** A new password. Not trimmed: spaces are allowed and count. */
const newPassword = z
  .string()
  .min(PASSWORD.minLength, `Use at least ${PASSWORD.minLength} characters.`)
  .refine(
    (value) => new TextEncoder().encode(value).length <= PASSWORD.maxBytes,
    `Use at most ${PASSWORD.maxBytes} bytes (about ${PASSWORD.maxBytes} letters or numbers).`,
  )
  .refine((value) => value.trim().length > 0, "The password cannot be only spaces.");

/** A password being checked. Only bounded, so a huge body cannot reach bcrypt. */
const existingPassword = z
  .string()
  .min(1, "Enter your password.")
  .max(1024, "Email or password is incorrect.");

export const signUpSchema = z
  .object({
    email,
    password: newPassword,
    consent: z.literal("on", { error: "Tick the box to accept the terms." }),
  })
  .refine(
    (value) => {
      const name = value.email.split("@")[0] ?? "";
      // Very short names would match by accident ("al" in "totally").
      return name.length < 4 || !value.password.toLowerCase().includes(name);
    },
    {
      path: ["password"],
      message: "Do not use your email address in your password.",
    },
  );

export const signInSchema = z.object({ email, password: existingPassword });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string().max(1024) })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });

export const changePasswordSchema = z
  .object({
    current: z.string().max(1024),
    password: newPassword,
    confirm: z.string().max(1024),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });
