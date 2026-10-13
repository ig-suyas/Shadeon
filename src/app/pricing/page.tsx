import { CheckIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/forms/forms";
import { PageShell } from "@/components/layout/page-shell";
import { button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Shadeon is free today under the MIT license. A Pro plan is planned; join the waitlist to hear when it is ready.",
  alternates: { canonical: "/pricing" },
};

const free = [
  "Every shader in the library today",
  "React TS, JavaScript and GLSL code",
  "Live customizer with shareable links",
  "MIT license, including commercial projects",
];

export default function PricingPage() {
  return (
    <PageShell
      title="Free today. Pro later."
      lead="Everything on Shadeon is free right now. A paid plan will come later for people who want more."
      width="wide"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section
          aria-labelledby="free-title"
          className="border-line bg-bg-raised rounded-card flex flex-col gap-6 border p-6 md:p-8"
        >
          <div className="flex flex-col gap-2">
            <h2 id="free-title" className="text-2xl font-semibold tracking-tight">
              Free
            </h2>
            <p className="text-text-muted">For everyone. No account needed.</p>
          </div>
          <p className="text-5xl font-semibold tracking-tighter">
            $0
            <span className="text-text-muted ml-2 text-base font-normal tracking-normal">
              today
            </span>
          </p>
          <ul className="flex flex-col gap-3">
            {free.map((item) => (
              <li key={item} className="flex gap-3">
                <CheckIcon size={20} aria-hidden="true" className="text-accent mt-0.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link href="/shaders" className={button("solid", "md", "mt-auto self-start")}>
            Browse shaders
          </Link>
        </section>

        <section
          aria-labelledby="pro-title"
          className="border-line rounded-card flex flex-col gap-6 border border-dashed p-6 md:p-8"
        >
          <div className="flex flex-col gap-2">
            <h2 id="pro-title" className="text-2xl font-semibold tracking-tight">
              Pro
              <span className="text-text-muted ml-3 text-base font-normal tracking-normal">
                coming later
              </span>
            </h2>
            <p className="text-text-muted max-w-[52ch] leading-relaxed">
              Pro is not built yet, and its price has not been set. The plan is a larger set of more
              elaborate shaders for people who want to support the project. Leave your email and we
              will tell you once, when it is ready.
            </p>
          </div>
          <WaitlistForm />
        </section>
      </div>
    </PageShell>
  );
}
