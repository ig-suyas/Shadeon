import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ThemedShader } from "@/components/shader/themed-shader";
import { button } from "@/components/ui/button";
import type { ShaderMeta } from "@/shaders/schema";

const COLOR_VARS = ["--bg", "--accent", "--hero-4"] as const;
const SETTINGS = { speed: 0.8, scale: 1.2, intensity: 1.3, seed: 52 };

/**
 * Closing call to action over Pointer Glow in the page's own tokens, so it
 * belongs to both themes: a lamp follows the cursor across the wall.
 */
export function Closing({ shader }: { shader: ShaderMeta }) {
  return (
    <section
      aria-labelledby="closing-title"
      className="border-line relative isolate overflow-hidden border-t"
    >
      <ThemedShader
        shader={shader}
        colorVars={COLOR_VARS}
        settings={SETTINGS}
        className="inset-0 -z-10"
        style={{ position: "absolute" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 90% at 22% 55%, color-mix(in srgb, var(--bg) 88%, transparent) 0%, transparent 100%)",
        }}
      />
      <div className="shell reveal flex flex-col items-start gap-8 py-28 md:py-40">
        <h2
          id="closing-title"
          className="max-w-[14ch] text-4xl leading-none font-semibold tracking-tighter md:text-6xl"
        >
          Start with one background.
        </h2>
        <Link href="/shaders" className={button("solid")}>
          Browse shaders
          <ArrowRightIcon size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
