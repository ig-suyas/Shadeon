"use client";

import { useEffect, useState } from "react";
import { dedicatedCount } from "@/engine/context-budget";
import { sharedStats } from "@/engine/shared-context";

interface Reading {
  shaders: number;
  contexts: number;
}

/** Real numbers from the engine on this page, refreshed once a second. */
export function LiveReadout() {
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    const measure = (): void => {
      const shared = sharedStats();
      const dedicated = dedicatedCount();
      setReading({
        shaders: shared.slots + dedicated,
        contexts: (shared.context ? 1 : 0) + dedicated,
      });
    };
    const timer = setInterval(measure, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className="border-line text-text-muted rounded-control border px-4 py-3 font-mono text-sm">
      {reading ? (
        <>
          This page has loaded <span className="text-text">{reading.shaders}</span>{" "}
          {reading.shaders === 1 ? "shader" : "shaders"} on{" "}
          <span className="text-text">{reading.contexts}</span> WebGL{" "}
          {reading.contexts === 1 ? "context" : "contexts"} so far.
        </>
      ) : (
        "Measuring this page."
      )}
    </p>
  );
}
