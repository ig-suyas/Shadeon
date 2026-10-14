import type { Metadata } from "next";
import { Suspense } from "react";
import { Gallery } from "@/components/gallery/gallery";
import { GalleryGrid } from "@/components/gallery/gallery-grid";
import { shaders } from "@/shaders/registry";

export const metadata: Metadata = {
  title: "Shaders",
  description:
    "Browse original animated WebGL shaders. Every preview is live. Open one to see it full size and copy its React, JavaScript or GLSL code.",
  alternates: { canonical: "/shaders" },
};

export default function ShadersPage() {
  return (
    <main id="main" className="shell flex-1 pt-[calc(var(--header-height)+2.5rem)] pb-24">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tighter md:text-5xl">Shaders</h1>
        <p className="text-text-muted max-w-[56ch] text-lg leading-relaxed">
          Open one to see it full size, tune it, or go straight to its code.
        </p>
      </div>
      {/*
        The gallery reads filters from the URL, which is only known in the
        browser. The fallback is the full unfiltered grid, so the prerendered
        HTML already contains every shader.
      */}
      <Suspense fallback={<GalleryGrid shaders={shaders} />}>
        <Gallery shaders={shaders} />
      </Suspense>
    </main>
  );
}
