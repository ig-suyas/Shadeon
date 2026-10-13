import Link from "next/link";
import { button } from "@/components/ui/button";
import { testimonials } from "@/content/testimonials";

/**
 * Social proof. Shows real quotes when there are some; until then, an honest
 * invitation to be the first.
 */
export function Community() {
  if (testimonials.length === 0) {
    return (
      <section aria-labelledby="community-title" className="border-line border-t">
        <div className="shell reveal flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div className="flex flex-col gap-3">
            <h2 id="community-title" className="text-2xl font-semibold tracking-tight md:text-3xl">
              Built something with Shadeon?
            </h2>
            <p className="text-text-muted max-w-[52ch] leading-relaxed">
              Shadeon is new. Projects and notes from developers who use it will be shown here.
            </p>
          </div>
          <Link href="/contact" className={button("outline")}>
            Show us your project
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="community-title" className="border-line border-t">
      <div className="shell flex flex-col gap-10 py-20 md:py-28">
        <h2 id="community-title" className="text-3xl font-semibold tracking-tight md:text-5xl">
          What developers say
        </h2>
        <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {testimonials.slice(0, 4).map((item) => (
            <li key={item.name} className="reveal">
              <figure className="flex flex-col gap-4">
                <blockquote className="line-clamp-3 text-xl leading-snug">
                  {`“${item.quote}”`}
                </blockquote>
                <figcaption className="text-text-muted text-sm">
                  {item.href ? (
                    <a
                      href={item.href}
                      rel="noopener noreferrer"
                      className="text-text underline underline-offset-4"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <span className="text-text">{item.name}</span>
                  )}
                  , {item.role}
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
