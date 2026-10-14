"use client";

import { useSyncExternalStore } from "react";
import type { ExportResult } from "@/export/generate";
import type { ExportTarget } from "@/export/targets";
import { loginHref } from "./auth-types";

/**
 * The browser's view of the session, for choosing what to show. It grants
 * nothing: /api/code and every account action check the cookie on the server.
 * One request per page load, shared by every component that asks.
 */

export type SessionState =
  { status: "loading" } | { status: "signed-out" } | { status: "signed-in"; email: string };

const LOADING: SessionState = { status: "loading" };
let state: SessionState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function set(next: SessionState): void {
  state = next;
  for (const listener of listeners) listener();
}

function load(): void {
  if (started) return;
  started = true;
  fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("session"))))
    .then((body: { signedIn?: unknown; email?: unknown }) => {
      set(
        body.signedIn === true && typeof body.email === "string"
          ? { status: "signed-in", email: body.email }
          : { status: "signed-out" },
      );
    })
    .catch(() => {
      // Unknown counts as signed out; a later 401 from /api/code agrees.
      set({ status: "signed-out" });
    });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  load();
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}

/** Marks the browser signed out after the server said so (a 401). */
export function markSignedOut(): void {
  if (state.status !== "signed-out") set({ status: "signed-out" });
}

/** The current page, for "come back here after signing in". */
export function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function loginHere(): string {
  return loginHref(currentPath());
}

export type CodeExports = Record<ExportTarget, ExportResult>;

export interface CodeResponse {
  exports: CodeExports;
  install: string | null;
}

export class SignInRequired extends Error {
  constructor() {
    super("Sign in to get the code");
  }
}

const codeCache = new Map<string, Promise<CodeResponse>>();

/**
 * Fetches the generated code from the server (signed-in only). Results are
 * kept per shader and settings for this page view, so moving a slider back
 * does not ask again.
 */
export function fetchCode(id: string, settings?: Record<string, unknown>): Promise<CodeResponse> {
  const body = JSON.stringify({ id, settings: settings ?? null });
  let pending = codeCache.get(body);
  if (!pending) {
    pending = fetch("/api/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body,
    }).then(async (response) => {
      if (response.status === 401) {
        markSignedOut();
        throw new SignInRequired();
      }
      if (!response.ok) throw new Error(`code request failed (${response.status})`);
      return (await response.json()) as CodeResponse;
    });
    pending.catch(() => codeCache.delete(body));
    if (codeCache.size > 200) codeCache.clear();
    codeCache.set(body, pending);
  }
  return pending;
}
