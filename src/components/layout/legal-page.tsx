import { WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL, PLACEHOLDER } from "@/content/legal";
import { PageShell, Prose } from "./page-shell";

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const pages = [
  { href: "/legal/license", label: "License" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/cookies", label: "Cookies" },
];

/** The contact address as a link, or as plain text while it is still a placeholder. */
export function ContactAddress() {
  if (PLACEHOLDER.test(LEGAL.contactEmail)) return <strong>{LEGAL.contactEmail}</strong>;
  return <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>;
}

interface LegalPageProps {
  title: string;
  lead: string;
  children: ReactNode;
}

/** Shared frame for legal pages: draft notice, date, text, and links to the other legal pages. */
export function LegalPage({ title, lead, children }: LegalPageProps) {
  return (
    <PageShell title={title} lead={lead}>
      {LEGAL.draft ? (
        <p
          role="note"
          className="border-line-strong rounded-control mb-8 flex items-start gap-3 border p-4 leading-relaxed"
        >
          <WarningIcon size={20} aria-hidden="true" className="text-danger mt-0.5 shrink-0" />
          <span>
            <strong className="font-medium">Draft.</strong> This text has not yet been reviewed by a
            lawyer and some details are still to be filled in. It describes how the site works
            today, but it is not final.
          </span>
        </p>
      ) : null}
      <p className="text-text-faint mb-6 font-mono text-xs">
        Last updated{" "}
        <time dateTime={LEGAL.updated}>
          {dateFormat.format(new Date(`${LEGAL.updated}T00:00:00Z`))}
        </time>
      </p>
      <Prose>{children}</Prose>
      <nav aria-label="Legal pages" className="border-line mt-14 border-t pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {pages.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="text-text-muted hover:text-text transition-colors duration-150"
              >
                {page.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PageShell>
  );
}
