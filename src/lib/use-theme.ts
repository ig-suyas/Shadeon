"use client";

import { useSyncExternalStore } from "react";
import { currentTheme, onThemeChange, type Theme } from "./theme";

const serverTheme = (): Theme => "dark";

/** The effective theme (toggle, else system setting), kept in sync; "dark" on the server. */
export function useTheme(): Theme {
  return useSyncExternalStore(onThemeChange, currentTheme, serverTheme);
}
