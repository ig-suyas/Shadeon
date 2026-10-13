import type { Metadata } from "next";
import Link from "next/link";
import { CodeBlock } from "@/components/code/code-block";
import { PageShell, Prose } from "@/components/layout/page-shell";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "How to add a Shadeon shader to a Next.js app, a Vite React app or a plain HTML page, and how to control it.",
  alternates: { canonical: "/docs" },
};

const sections = [
  { id: "get-the-code", label: "Get the code" },
  { id: "nextjs", label: "Next.js" },
  { id: "vite", label: "Vite and React" },
  { id: "html", label: "Plain HTML" },
  { id: "settings", label: "Settings" },
  { id: "performance", label: "Performance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "license", label: "License" },
];

const INSTALL = `npx shadcn@latest add ${SITE_URL}/r/mesh-drift.json`;

const NEXT_USAGE = `import { MeshDrift } from "@/components/shadeon/mesh-drift";

export default function Page() {
  return (
    <section className="relative isolate min-h-[100dvh] overflow-hidden">
      <MeshDrift className="absolute inset-0 -z-10" />
      <div className="p-10">
        <h1>Your content</h1>
      </div>
    </section>
  );
}`;

const VITE_USAGE = `import { MeshDrift } from "./components/mesh-drift";

export function Hero() {
  return (
    <section style={{ position: "relative", isolation: "isolate", minHeight: "100vh" }}>
      <MeshDrift style={{ position: "absolute", inset: 0, zIndex: -1 }} />
      <h1>Your content</h1>
    </section>
  );
}`;

const HTML_USAGE = `<section class="hero">
  <canvas id="mesh-drift"></canvas>
  <h1>Your content</h1>
</section>

<style>
  .hero {
    position: relative;
    isolation: isolate;
    min-height: 100vh;
  }
  #mesh-drift {
    position: absolute;
    inset: 0;
    z-index: -1;
    display: block;
    width: 100%;
    height: 100%;
  }
</style>

<script type="module" src="./mesh-drift.js"></script>`;

const HTML_CONTROL = `import { shader } from "./mesh-drift.js";

shader.set({ speed: 2, colors: ["#ff6b3d", "#ffc56b", "#3a2bd9", "#0b1026"] });
shader.pause();
shader.play();
shader.destroy();`;

const PROPS_USAGE = `<MeshDrift
  className="absolute inset-0 -z-10"
  colors={["#7df9d0", "#1fb6c9", "#0d3b8c", "#041226"]}
  speed={0.6}
  scale={1.3}
  seed={42}
  maxDpr={1.5}
  paused={menuOpen}
/>`;

export default function DocsPage() {
  return (
    <PageShell
      title="Docs"
      lead="Every Shadeon shader is one file with no dependencies. Pick a shader, copy its code, and put it behind your content."
      width="wide"
    >
      <div className="grid gap-12 lg:grid-cols-[200px_minmax(0,720px)]">
        <nav aria-label="On this page" className="max-lg:hidden">
          <ul className="sticky top-[calc(var(--header-height)+2rem)] flex flex-col gap-2 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="text-text-muted hover:text-text transition-colors duration-150"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Prose className="[&_h2]:first:mt-0">
          <h2 id="get-the-code">Get the code</h2>
          <p>
            Open any shader in the <Link href="/shaders">gallery</Link> and press{" "}
            <strong>Code</strong>. You get three versions: a React and TypeScript component, plain
            JavaScript, and the raw GLSL fragment shader. On a shader&apos;s own page you can tune
            colours, speed and shape first, and the code updates to match.
          </p>
          <p>
            If your project uses the shadcn CLI, you can add the React component with one command
            instead of copying it. Replace <code>mesh-drift</code> with the id of the shader you
            want.
          </p>
          <CodeBlock code={INSTALL} lang="bash" title="Terminal" />

          <h2 id="nextjs">Next.js</h2>
          <ol>
            <li>
              Save the React TS code as <code>components/shadeon/mesh-drift.tsx</code>, or run the
              command above.
            </li>
            <li>
              Render it inside a positioned container. The file already starts with{" "}
              <code>&quot;use client&quot;</code>, so you can import it from a Server Component.
            </li>
          </ol>
          <CodeBlock code={NEXT_USAGE} lang="tsx" title="app/page.tsx" />
          <p>
            The canvas fills its parent. <code>isolate</code> on the container and{" "}
            <code>-z-10</code> on the shader keep it behind your content without affecting the rest
            of the page.
          </p>

          <h2 id="vite">Vite and React</h2>
          <p>
            The same file works in any React 18 or 19 project. Save it as{" "}
            <code>src/components/mesh-drift.tsx</code>. The <code>&quot;use client&quot;</code> line
            at the top is ignored outside frameworks that use it. Without Tailwind, position it with
            the <code>style</code> prop.
          </p>
          <CodeBlock code={VITE_USAGE} lang="tsx" title="src/Hero.tsx" />

          <h2 id="html">Plain HTML</h2>
          <p>
            Save the JavaScript version as <code>mesh-drift.js</code> next to your page. It looks
            for a canvas whose id is the shader id.
          </p>
          <CodeBlock code={HTML_USAGE} lang="html" title="index.html" />
          <p>
            The file exports a handle, so another module script can change the shader after it has
            started.
          </p>
          <CodeBlock code={HTML_CONTROL} lang="javascript" title="main.js" />

          <h2 id="settings">Settings</h2>
          <p>
            Every shader takes <code>colors</code>, <code>speed</code>, <code>scale</code>,{" "}
            <code>intensity</code> and <code>seed</code>. Some add their own, listed in the props
            table on the shader&apos;s page. In React they are props; in JavaScript they are keys of
            the settings object and of <code>shader.set()</code>.
          </p>
          <CodeBlock code={PROPS_USAGE} lang="tsx" title="Props" />
          <ul>
            <li>
              <code>colors</code> are hex strings such as <code>#1a2b3c</code>.
            </li>
            <li>
              <code>seed</code> picks a different arrangement of the same look.
            </li>
            <li>
              <code>paused</code> freezes the animation on the current frame.
            </li>
            <li>
              <code>maxDpr</code> caps the pixel ratio. The default is 2.
            </li>
          </ul>

          <h2 id="performance">Performance</h2>
          <ul>
            <li>WebGL starts only when the canvas first scrolls into view.</li>
            <li>Rendering stops while the canvas is off screen or the tab is in the background.</li>
            <li>
              If frames start to drop, the shader lowers its own resolution in steps and raises it
              again when there is headroom.
            </li>
            <li>
              Each shader has a cost rating on its page. For heavy shaders on phones, set{" "}
              <code>maxDpr</code> to 1 or keep the canvas to part of the screen.
            </li>
            <li>
              Browsers allow only a limited number of WebGL canvases at once. One or two per page is
              the right amount.
            </li>
          </ul>

          <h2 id="accessibility">Accessibility</h2>
          <ul>
            <li>
              The canvas is marked <code>aria-hidden</code>. It is decoration, so screen readers
              skip it.
            </li>
            <li>
              Visitors who ask their system for reduced motion get a single still frame instead of
              animation.
            </li>
            <li>
              Shaders change colour constantly. Put text over them on a solid or semi-opaque layer
              so it always has enough contrast.
            </li>
          </ul>

          <h2 id="license">License</h2>
          <p>
            The shader code is MIT licensed. You can use it in personal and commercial projects.
            Keep the license notice that sits at the top of each file. The details are on the{" "}
            <Link href="/legal/license">license page</Link>.
          </p>
        </Prose>
      </div>
    </PageShell>
  );
}
