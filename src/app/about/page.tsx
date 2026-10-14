import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Prose } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "About",
  description:
    "Shadeon is a free library of original animated shaders for the web, built to be small, fast and easy to paste into a project.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell
      title="About Shadeon"
      lead="A free library of animated backgrounds for the web, made to be pasted into a project in a minute and to behave well once it is there."
    >
      <Prose>
        <h2>Why it exists</h2>
        <p>
          Animated gradients, grain and soft light are everywhere on modern sites, but getting one
          usually means pulling in a large graphics library or adapting code whose license does not
          allow commercial use. Shadeon gives you the effect as a single file you own, under a
          license that lets you ship it.
        </p>

        <h2>What we hold to</h2>
        <ul>
          <li>
            <strong>Original work.</strong> Every shader is written from scratch for Shadeon.
            Nothing is copied or ported from other shader sites, and each shader carries a note of
            how it was made.
          </li>
          <li>
            <strong>What you see is what you copy.</strong> The preview on the site runs the same
            code you are given. This is checked automatically, pixel by pixel.
          </li>
          <li>
            <strong>Small and self-contained.</strong> No package to install and no dependency to
            keep up to date. Each export is one file.
          </li>
          <li>
            <strong>Considerate by default.</strong> Shaders stop when they are off screen, respect
            reduced motion, and lower their own resolution on slow devices.
          </li>
          <li>
            <strong>Little data.</strong> No advertising, no tracking cookies. A free account,
            needed only to copy code, holds just your email address.
          </li>
        </ul>

        <h2>Free and Pro</h2>
        <p>
          Everything in the library today is free under the MIT license. A paid Pro plan is planned
          to fund the work. You can read what is known about it on the{" "}
          <Link href="/pricing">pricing page</Link>.
        </p>

        <h2>Get in touch</h2>
        <p>
          Missing a look you need? <Link href="/request">Request a shader</Link>. Found a problem or
          built something with Shadeon? <Link href="/contact">Send a message</Link>.
        </p>
      </Prose>
    </PageShell>
  );
}
