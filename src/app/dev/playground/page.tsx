import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Playground } from "./playground";

export const metadata: Metadata = {
  title: "Engine playground",
  robots: { index: false, follow: false },
};

/** Development-only page for checking the shader engine and code export by eye. */
export default function PlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Playground />;
}
