import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { ThemedShader } from "@/components/shader/themed-shader";
import { button } from "@/components/ui/button";
import { getShader } from "@/shaders/registry";

export const metadata: Metadata = {
  title: "Page not found",
};

const COLOR_VARS = ["--bg", "--line-strong", "--text-faint"] as const;
const SETTINGS = { speed: 0.6, scale: 3.2, intensity: 0.9, seed: 404, levels: 30 };

/** A 404 that still shows what the site is for: a live contour field in the page's own colours. */
export default function NotFound() {
  const shader = getShader("contour-field");
  return (
    <main
      id="main"
      className="relative isolate flex min-h-[100dvh] flex-1 flex-col justify-center overflow-hidden"
    >
      {shader ? (
        <ThemedShader
          shader={shader}
          colorVars={COLOR_VARS}
          settings={SETTINGS}
          className="inset-0 -z-10"
          style={{ position: "absolute" }}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 70% at 25% 50%, color-mix(in srgb, var(--bg) 90%, transparent) 0%, transparent 100%)",
        }}
      />
      <div className="shell flex flex-col items-start gap-6 pt-(--header-height)">
        <p className="text-text-muted font-mono text-sm">404</p>
        <h1 className="max-w-[16ch] text-4xl leading-none font-semibold tracking-tighter md:text-6xl">
          This page could not be found.
        </h1>
        <p className="text-text-muted max-w-[48ch] text-lg leading-relaxed">
          The link may be old, or the address may have a typo. The shaders are all still here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/shaders" className={button("solid")}>
            Browse shaders
            <ArrowRightIcon size={18} aria-hidden="true" />
          </Link>
          <Link href="/" className={button("glass")}>
            Go to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}
