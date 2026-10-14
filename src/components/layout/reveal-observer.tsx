"use client";

import { useEffect } from "react";
import { DURATION, EASE, REVEAL_DISTANCE, STAGGER } from "@/lib/motion";

const HIDDEN: Keyframe = { opacity: 0, transform: `translateY(${REVEAL_DISTANCE}px)` };

/** Elements held back below the fold, with the animation that holds them. */
const held = new Map<Element, Animation>();
/** Elements already handled (held, revealed or left alone). */
const seen = new WeakSet<Element>();

/**
 * Scroll reveals for `.reveal` elements: opacity and a 20px rise, once, as
 * each one enters the viewport. Elements already on screen when they first
 * render are left alone, so nothing that has painted ever disappears; only
 * content below the fold is held back until it arrives. Without JavaScript,
 * or with reduced motion, everything simply shows.
 *
 * Everything runs through the Web Animations API: the elements' attributes
 * never change, so React can still hydrate content that streams in after this
 * runs. A MutationObserver (which runs before the next paint) picks up that
 * content and pages reached by navigation. Elements not rendered yet, such as
 * streamed content still parked in a hidden container, wait until they are.
 */
export function RevealObserver() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const reveal = new IntersectionObserver(
      (entries) => {
        // Siblings arriving together cascade instead of landing as one block.
        let order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const element = entry.target;
          reveal.unobserve(element);
          held.get(element)?.cancel();
          held.delete(element);
          element.animate([HIDDEN, { opacity: 1, transform: "none" }], {
            duration: DURATION.reveal * 1000,
            delay: order * STAGGER * 1000,
            easing: `cubic-bezier(${EASE.enter.join(",")})`,
            fill: "backwards",
          });
          order += 1;
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );

    const scan = (): void => {
      for (const element of held.keys()) {
        if (!element.isConnected) held.delete(element);
      }
      for (const element of document.querySelectorAll(".reveal")) {
        if (seen.has(element) || element.getClientRects().length === 0) continue;
        seen.add(element);
        if (element.getBoundingClientRect().top < window.innerHeight) continue;
        held.set(element, element.animate([HIDDEN, HIDDEN], { duration: 1, fill: "forwards" }));
        reveal.observe(element);
      }
    };

    // Elements held by an earlier mount (development re-runs effects).
    for (const element of held.keys()) reveal.observe(element);
    scan();

    const inserted = new MutationObserver(scan);
    inserted.observe(document.body, { childList: true, subtree: true });

    return () => {
      inserted.disconnect();
      reveal.disconnect();
    };
  }, []);

  return null;
}
