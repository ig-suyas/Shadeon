import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send feedback, report a problem, or show what you built with Shadeon.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact"
      lead="Feedback, a bug, a licensing question, or something you built with Shadeon. Every message is read."
    >
      <ContactForm />
    </PageShell>
  );
}
