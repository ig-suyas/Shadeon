import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { ShaderCard } from "@/components/shader/shader-card";
import type { ShaderMeta } from "@/shaders/schema";

/**
 * Three live shaders: one large, two stacked. On small screens they become a
 * single column of 4:3 cards.
 */
export function Featured({ shaders }: { shaders: ShaderMeta[] }) {
  const [lead, ...rest] = shaders.slice(0, 3);
  if (!lead) return null;
  return (
    <section aria-labelledby="featured-title" className="shell py-20 md:py-28">
      <div className="reveal flex flex-col gap-4">
        <h2
          id="featured-title"
          className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl"
        >
          Live, not screenshots.
        </h2>
        <p className="text-text-muted max-w-[52ch] text-lg leading-relaxed">
          Every preview on this site is the real shader running in your browser. Open one to see it
          full size.
        </p>
      </div>
      <div className="mt-10 grid gap-4 md:h-[620px] md:grid-cols-[1.65fr_1fr] md:grid-rows-2">
        <ShaderCard
          shader={lead}
          className="reveal md:row-span-2"
          surfaceClassName="aspect-[4/3] md:aspect-auto"
        />
        {rest.map((shader) => (
          <ShaderCard
            key={shader.id}
            shader={shader}
            className="reveal"
            surfaceClassName="aspect-[4/3] md:aspect-auto"
          />
        ))}
      </div>
      <Link
        href="/shaders"
        className="text-text hover:text-text-muted mt-8 inline-flex items-center gap-2 font-medium transition-colors duration-150"
      >
        Browse shaders
        <ArrowRightIcon size={18} aria-hidden="true" />
      </Link>
    </section>
  );
}
