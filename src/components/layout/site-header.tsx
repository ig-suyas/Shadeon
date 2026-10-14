import Link from "next/link";
import { button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { AccountLink } from "./account-link";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/shaders", label: "Shaders" },
  // "narrow: false" links hide on phones to make room for Sign in; the footer links them.
  { href: "/docs", label: "Docs", narrow: false },
  { href: "/pricing", label: "Pricing", narrow: false },
];

/**
 * A floating bar: it hovers 12px below the top edge as a glass pill instead of
 * spanning the window, so the page (and the hero) runs behind and above it.
 * Its outer height still equals --header-height, which pages pad for.
 */
export function SiteHeader() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-(--z-header) h-(--header-height) pt-3">
      <div className="shell h-full">
        <div className="border-line-strong/70 bg-bg/70 shadow-float supports-[not(backdrop-filter:blur(1px))]:bg-bg rounded-pill pointer-events-auto flex h-full items-center justify-between gap-3 border pr-1.5 pl-4 backdrop-blur-xl backdrop-saturate-150 sm:pl-5">
          <Link href="/" aria-label="Shadeon home" className="rounded-pill -mx-1 px-1 py-1">
            <Wordmark id="mark-header" />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-text-muted hover:text-text hover:bg-text/6 rounded-pill px-2.5 py-1.5 text-sm transition-colors duration-(--duration-fast) sm:px-3.5",
                  "narrow" in link && link.narrow === false && "max-sm:hidden",
                )}
              >
                {link.label}
              </Link>
            ))}
            <ThemeToggle />
            <AccountLink />
            <Link href="/shaders" className={button("solid", "sm", "ml-1 max-md:hidden")}>
              Browse shaders
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
