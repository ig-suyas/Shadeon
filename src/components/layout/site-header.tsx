import Link from "next/link";
import { button } from "@/components/ui/button";
import { Wordmark } from "./wordmark";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/shaders", label: "Shaders" },
  { href: "/docs", label: "Docs" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteHeader() {
  return (
    <header className="border-line/60 bg-bg/75 supports-[not(backdrop-filter:blur(1px))]:bg-bg fixed inset-x-0 top-0 z-(--z-header) h-(--header-height) border-b backdrop-blur-md">
      <div className="shell flex h-full items-center justify-between gap-4">
        <Link href="/" aria-label="Shadeon home" className="rounded-control -mx-1 px-1">
          <Wordmark />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-muted hover:text-text rounded-control px-2 py-2 text-sm transition-colors duration-150 sm:px-3"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          <Link href="/shaders" className={button("solid", "sm", "ml-2 max-md:hidden")}>
            Browse shaders
          </Link>
        </nav>
      </div>
    </header>
  );
}
