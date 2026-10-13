import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { releases, roadmap, type RoadmapItem } from "@/content/changelog";

export const metadata: Metadata = {
  title: "Changelog and roadmap",
  description: "What has shipped on Shadeon, and what is being worked on next.",
  alternates: { canonical: "/changelog" },
};

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function RoadmapColumn({ title, items }: { title: string; items: RoadmapItem[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-text-muted text-lg font-medium">{title}</h3>
      <ul className="flex flex-col gap-5">
        {items.map((item) => (
          <li key={item.title} className="flex flex-col gap-1">
            <span className="font-medium">{item.title}</span>
            <span className="text-text-muted leading-relaxed">{item.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ChangelogPage() {
  return (
    <PageShell
      title="Changelog and roadmap"
      lead="What has shipped, and what is being worked on. The roadmap shows direction, not dates."
      width="wide"
    >
      <section aria-labelledby="roadmap-title">
        <h2 id="roadmap-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Roadmap
        </h2>
        <div className="mt-6 grid gap-10 md:grid-cols-3">
          <RoadmapColumn title="Now" items={roadmap.now} />
          <RoadmapColumn title="Next" items={roadmap.next} />
          <RoadmapColumn title="Later" items={roadmap.later} />
        </div>
        <p className="text-text-muted mt-8">
          Want something that is not here?{" "}
          <Link href="/request" className="text-text underline underline-offset-4">
            Request a shader
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="changelog-title" className="mt-20 max-w-[720px]">
        <h2 id="changelog-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Changelog
        </h2>
        <ol className="mt-6 flex flex-col gap-12">
          {releases.map((release) => (
            <li key={release.date} className="flex flex-col gap-3">
              <time dateTime={release.date} className="text-text-faint font-mono text-xs">
                {dateFormat.format(new Date(`${release.date}T00:00:00Z`))}
              </time>
              <h3 className="text-xl font-medium">{release.title}</h3>
              <ul className="text-text-muted flex list-disc flex-col gap-2 pl-5 leading-relaxed">
                {release.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
