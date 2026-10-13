import type { Metadata } from "next";
import { RequestForm } from "@/components/forms/forms";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Request a shader",
  description: "Describe the animated background you need and it may be built for the library.",
  alternates: { canonical: "/request" },
};

export default function RequestPage() {
  return (
    <PageShell
      title="Request a shader"
      lead="Describe the look you need. Requests shape what gets built next."
    >
      <RequestForm />
    </PageShell>
  );
}
