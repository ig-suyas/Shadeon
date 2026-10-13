import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CopyCodeButton } from "@/components/shader/copy-code-button";
import { ThemedShader } from "@/components/shader/themed-shader";
import { button } from "@/components/ui/button";
import type { ShaderMeta } from "@/shaders/schema";

export const HERO_COLOR_VARS = ["--hero-1", "--hero-2", "--hero-3", "--hero-4"] as const;
export const HERO_SETTINGS = { speed: 0.7, scale: 1.15, intensity: 1.1, seed: 41 };

/**
 * Full-bleed live shader with the message anchored bottom-left, where a scrim
 * to the page colour guarantees contrast whatever the shader is doing.
 */
export function Hero({ shader }: { shader: ShaderMeta }) {
  return (
    <section className="relative isolate flex min-h-[100dvh] flex-col justify-end overflow-hidden">
      <ThemedShader
        shader={shader}
        colorVars={HERO_COLOR_VARS}
        settings={HERO_SETTINGS}
        className="inset-0 -z-10"
        style={{ position: "absolute" }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 82%, transparent) 26%, transparent 64%)",
        }}
      />
      <div className="shell pt-[calc(var(--header-height)+2rem)] pb-14 md:pb-20">
        <h1 className="enter-solid max-w-[13ch] text-[clamp(2.25rem,10.4vw,5.5rem)] leading-[0.95] font-semibold tracking-tighter text-balance">
          Animated shaders, ready to paste.
        </h1>
        <p
          className="enter text-text-muted mt-6 max-w-[44ch] text-lg leading-relaxed"
          style={{ "--i": 1 } as CSSProperties}
        >
          A free library of original WebGL backgrounds. Tune one live, then copy it as React,
          JavaScript or GLSL.
        </p>
        <div className="enter mt-8 flex flex-wrap gap-3" style={{ "--i": 2 } as CSSProperties}>
          <Link href="/shaders" className={button("solid")}>
            Browse shaders
            <ArrowRightIcon size={18} aria-hidden="true" />
          </Link>
          <CopyCodeButton
            shader={shader}
            settings={HERO_SETTINGS}
            colorVars={HERO_COLOR_VARS}
            label="Copy a shader"
            variant="glass"
          />
        </div>
      </div>
    </section>
  );
}
