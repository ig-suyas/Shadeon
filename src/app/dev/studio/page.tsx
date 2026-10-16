import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioStage } from "./studio-stage";

export const metadata: Metadata = {
  title: "Studio stage",
  robots: { index: false, follow: false },
};

/**
 * Development-only: one studio shader filling the window, for interaction
 * tests. `?id=<shader>` picks it, `?preset=<id>` a preset, `?mode=shared`
 * renders the card still instead of the live surface.
 */
export default function StudioPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <StudioStage />;
}
