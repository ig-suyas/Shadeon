import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import type { CSSProperties } from "react";
import { button } from "@/components/ui/button";
import { HeroSculpture } from "./hero-sculpture";

/**
 * Editorial hero: a live sculpture of loose grains floats in the upper part of the
 * screen over a huge, faint wordmark in block capitals; the message sits below it, bottom-left,
 * on the plain page colour. The form never reaches the text zone, so the copy
 * keeps full contrast in both themes whatever the shader is doing.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[max(100dvh,680px)] flex-col justify-end overflow-hidden">
      <span
        aria-hidden="true"
        className="text-text pointer-events-none absolute inset-x-0 top-[33%] -z-20 -translate-y-1/2 text-center text-[clamp(4.5rem,19vw,19rem)] leading-none font-black tracking-[-0.05em] whitespace-nowrap uppercase opacity-[0.05] select-none"
      >
        Shadeon
      </span>
      <HeroSculpture />

      <div className="shell flex items-end justify-between gap-8 pt-[calc(var(--header-height)+2rem)] pb-10 md:pb-14">
        {/* The sculpture fills the band between the header and this block. */}
        <div data-hero-copy>
          <p className="enter text-text-muted flex items-center gap-3 text-xs font-medium tracking-[0.16em] uppercase">
            <span aria-hidden="true" className="bg-line-strong h-px w-8" />
            Shader library
          </p>
          <h1 className="enter-solid tracking-display mt-5 text-[clamp(2.25rem,1.3rem+3.7vw,4.5rem)] leading-[1.02] font-semibold">
            Animated shaders,{" "}
            <span className="text-text-muted block font-light">ready to paste.</span>
          </h1>
          <p
            className="enter text-text-muted mt-6 max-w-[42ch] text-base leading-relaxed md:text-lg"
            style={{ "--i": 1 } as CSSProperties}
          >
            Original WebGL backgrounds. Tune one live, then copy it as React, JavaScript or GLSL.
          </p>
          <div
            className="enter mt-8 flex flex-wrap items-center gap-x-7 gap-y-4"
            style={{ "--i": 2 } as CSSProperties}
          >
            <Link href="/shaders" className={button("solid")}>
              Browse shaders
              <ArrowRightIcon size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/docs"
              className="group text-text decoration-line-strong hover:decoration-text inline-flex h-11 items-center gap-2 text-[15px] font-medium underline underline-offset-[6px] transition-colors duration-(--duration-fast)"
            >
              Read the docs
              <ArrowRightIcon
                size={16}
                aria-hidden="true"
                className="transition-transform duration-(--duration-base) ease-out group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </div>
        <p
          aria-hidden="true"
          className="enter text-text-faint hidden pb-3 text-xs tracking-[0.16em] whitespace-nowrap uppercase sm:block"
          style={{ "--i": 3 } as CSSProperties}
        >
          <span className="[@media(hover:none)]:hidden">Move through the form</span>
          <span className="hidden [@media(hover:none)]:inline">Touch the form</span>
        </p>
      </div>
    </section>
  );
}
