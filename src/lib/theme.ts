export const THEME_STORAGE_KEY = "shadeon:theme";

/**
 * Runs before first paint (inline in <head>) so a stored theme choice never
 * flashes the wrong colours. Without a stored choice the CSS follows the
 * system preference by itself.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

/** Calls back whenever the effective theme may have changed. Returns an unsubscribe. */
export function onThemeChange(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = matchMedia("(prefers-color-scheme: light)");
  media.addEventListener("change", callback);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", callback);
  };
}
