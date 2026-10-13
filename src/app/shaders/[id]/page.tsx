import { ArrowLeftIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Workbench } from "@/components/detail/workbench";
import { ShaderCard } from "@/components/shader/shader-card";
import { componentName } from "@/export/naming";
import { getShader, shaders } from "@/shaders/registry";
import { COST_LABELS, relatedShaders } from "@/shaders/related";
import type { ShaderMeta } from "@/shaders/schema";

export function generateStaticParams(): { id: string }[] {
  return shaders.map((shader) => ({ id: shader.id }));
}

export async function generateMetadata({ params }: PageProps<"/shaders/[id]">): Promise<Metadata> {
  const { id } = await params;
  const shader = getShader(id);
  if (!shader) return {};
  const title = `${shader.name} shader`;
  const description = `${shader.description} Free animated WebGL shader with React, JavaScript and GLSL code.`;
  return {
    title,
    description,
    alternates: { canonical: `/shaders/${shader.id}` },
    openGraph: { title, description, url: `/shaders/${shader.id}`, type: "article" },
  };
}

interface PropRow {
  name: string;
  type: string;
  fallback: string;
  description: string;
}

function propRows(shader: ShaderMeta): PropRow[] {
  const rows: PropRow[] = [
    {
      name: "colors",
      type: `[${shader.colors.default.map(() => "string").join(", ")}]`,
      fallback: `[${shader.colors.default.map((hex) => `"${hex}"`).join(", ")}]`,
      description: `${shader.colors.labels.join(", ")}. Hex colours.`,
    },
  ];
  for (const control of shader.controls) {
    rows.push({
      name: control.key,
      type: control.type === "float" ? "number" : "boolean",
      fallback: String(control.default),
      description:
        control.type === "float"
          ? `${control.description ?? control.label + "."} Range ${control.min} to ${control.max}.`
          : (control.description ?? `${control.label}.`),
    });
  }
  rows.push(
    {
      name: "paused",
      type: "boolean",
      fallback: "false",
      description: "Freeze the animation on the current frame.",
    },
    {
      name: "maxDpr",
      type: "number",
      fallback: "2",
      description: "Upper bound for devicePixelRatio. Lower it to save GPU time.",
    },
    {
      name: "className",
      type: "string",
      fallback: "",
      description: "Classes for the canvas, for example to position it.",
    },
    {
      name: "style",
      type: "CSSProperties",
      fallback: "",
      description: "Inline styles for the canvas.",
    },
  );
  return rows;
}

function usageNotes(shader: ShaderMeta): { title: string; body: string }[] {
  const notes = [
    {
      title: "Give it a box",
      body: "The canvas fills its parent. Put it in a positioned container with a size, or pass classes such as absolute inset-0 to stretch it behind your content.",
    },
    {
      title: "Keep it behind the content",
      body: "The canvas is decorative and hidden from screen readers. Place your content after it in a relative container so text stays on top and selectable.",
    },
    {
      title: "It looks after itself",
      body: "Rendering starts when the canvas scrolls into view and stops when it leaves or the tab is hidden. Visitors who prefer reduced motion get one still frame.",
    },
  ];
  if (shader.reactive.pointer) {
    notes.push({
      title: "Pointer reactive",
      body: "This shader follows the pointer across the whole window, so it still reacts when content sits on top of it. Nothing to wire up.",
    });
  }
  if (shader.reactive.scroll) {
    notes.push({
      title: "Scroll reactive",
      body: "This shader reads how far the page has scrolled. It works best on pages that are taller than the screen.",
    });
  }
  return notes;
}

type Params = PageProps<"/shaders/[id]">["params"];

/**
 * The page frame renders at once; everything that depends on the id sits in a
 * Suspense boundary, so in-app navigation to a shader is instant. Every id is
 * known at build time, so the prerendered HTML still contains the full page.
 */
export default function ShaderPage({ params }: PageProps<"/shaders/[id]">) {
  return (
    <main id="main" className="shell flex-1 pt-[calc(var(--header-height)+2rem)] pb-24">
      <Link
        href="/shaders"
        className="text-text-muted hover:text-text inline-flex items-center gap-2 text-sm transition-colors duration-150"
      >
        <ArrowLeftIcon size={16} aria-hidden="true" />
        All shaders
      </Link>
      <Suspense fallback={<DetailSkeleton />}>
        <ShaderDetail params={params} />
      </Suspense>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="mt-5 flex flex-col gap-4">
      <span className="sr-only">Loading shader</span>
      <div className="bg-bg-raised rounded-control h-12 w-64" />
      <div className="bg-bg-raised rounded-control h-6 w-full max-w-xl" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="bg-bg-raised rounded-card aspect-[16/10] w-full" />
        <div className="bg-bg-raised rounded-card h-96" />
      </div>
    </div>
  );
}

async function ShaderDetail({ params }: { params: Params }) {
  const { id } = await params;
  const shader = getShader(id);
  if (!shader) notFound();

  const cost = COST_LABELS[shader.cost];
  const related = relatedShaders(shader, shaders);
  const name = componentName(shader.id);

  return (
    <>
      <div className="mt-5 mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tighter md:text-5xl">{shader.name}</h1>
        <p className="text-text-muted max-w-[60ch] text-lg leading-relaxed">{shader.description}</p>
        <p className="text-text-faint font-mono text-xs">
          {shader.category}, {cost.label.toLowerCase()}, MIT, v{shader.version}
        </p>
      </div>

      <Workbench shader={shader} />

      <section aria-labelledby="usage-title" className="mt-20">
        <h2 id="usage-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Using it
        </h2>
        <dl className="mt-6 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {usageNotes(shader).map((note) => (
            <div key={note.title} className="flex flex-col gap-2">
              <dt className="text-lg font-medium">{note.title}</dt>
              <dd className="text-text-muted max-w-[52ch] leading-relaxed">{note.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="props-title" className="mt-20">
        <h2 id="props-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Props
        </h2>
        <p className="text-text-muted mt-2 max-w-[60ch] leading-relaxed">
          Props of the {name} React component. The JavaScript version takes the same names in its
          settings object.
        </p>
        <div className="border-line rounded-card mt-5 overflow-x-auto border">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-line text-text-muted border-b">
                <th scope="col" className="px-4 py-3 font-medium">
                  Prop
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Default
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              {propRows(shader).map((row) => (
                <tr key={row.name} className="align-top">
                  <th scope="row" className="px-4 py-2.5 font-mono text-[13px] font-normal">
                    {row.name}
                  </th>
                  <td className="text-text-muted px-4 py-2.5 font-mono text-[13px]">{row.type}</td>
                  <td className="text-text-muted px-4 py-2.5 font-mono text-[13px]">
                    {row.fallback || <span className="sr-only">none</span>}
                  </td>
                  <td className="text-text-muted px-4 py-2.5 leading-relaxed">{row.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="performance-title" className="mt-20">
        <h2 id="performance-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
          Performance
        </h2>
        <p className="mt-4 text-lg">
          <span className="font-medium">{cost.label}.</span>{" "}
          <span className="text-text-muted">Cost {shader.cost} of 3.</span>
        </p>
        <p className="text-text-muted mt-2 max-w-[60ch] leading-relaxed">{cost.detail}</p>
      </section>

      {related.length > 0 ? (
        <section aria-labelledby="related-title" className="mt-20">
          <h2 id="related-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
            Related shaders
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <li key={other.id}>
                <ShaderCard shader={other} surfaceClassName="aspect-[4/3]" detail />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
