import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewSheet } from "./review-sheet";

export const metadata: Metadata = {
  title: "Shader review sheet",
  robots: { index: false, follow: false },
};

/**
 * Development-only contact sheet: one row per shader, one tile per preset.
 * `?ids=a,b,c` limits it to those shaders. `scripts/shoot.mjs` photographs it.
 */
export default function ReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ReviewSheet />;
}
