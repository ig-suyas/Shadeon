"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useLayoutEffect, useSyncExternalStore } from "react";
import { currentTheme, onThemeChange, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  // null on the server and during hydration: the real theme is only known in the browser.
  const theme = useSyncExternalStore<Theme | null>(onThemeChange, currentTheme, () => null);
  const next: Theme = theme === "light" ? "dark" : "light";

  // In development, Strict Mode's remount resets <html> attributes that the inline
  // theme script set, so the stored choice is applied again here, before paint.
  useLayoutEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        document.documentElement.dataset.theme = stored;
      }
    } catch {
      // Storage can be blocked; the system preference applies.
    }
  }, []);

  const toggle = (): void => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the choice then lasts for this page view only.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme ? `Switch to ${next} theme` : "Switch theme"}
      className="text-text-muted hover:text-text hover:bg-text/6 rounded-pill grid size-9 place-items-center transition-colors duration-(--duration-fast)"
    >
      {theme === "light" ? (
        <MoonIcon size={18} weight="regular" aria-hidden="true" />
      ) : (
        <SunIcon size={18} weight="regular" aria-hidden="true" />
      )}
    </button>
  );
}
