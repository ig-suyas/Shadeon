import Link from "next/link";
import { Wordmark } from "./wordmark";

const groups = [
  {
    title: "Library",
    links: [
      { href: "/shaders", label: "Shaders" },
      { href: "/docs", label: "Docs" },
      { href: "/changelog", label: "Changelog" },
      { href: "/request", label: "Request a shader" },
    ],
  },
  {
    title: "Shadeon",
    links: [
      { href: "/about", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/license", label: "License" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-line border-t">
      <div className="shell grid grid-cols-2 gap-10 py-14 sm:grid-cols-3 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-full flex flex-col gap-4 md:col-span-1">
          <Wordmark />
          <p className="text-text-muted max-w-[34ch] text-sm leading-relaxed">
            Original animated shaders for the web. Free to use in personal and commercial projects
            under the MIT license.
          </p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-medium">{group.title}</h2>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-text-muted hover:text-text text-sm transition-colors duration-150"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
    </footer>
  );
}
