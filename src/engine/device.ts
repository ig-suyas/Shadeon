export interface DeviceProfile {
  lowPower: boolean;
  /** DPR cap for large surfaces (hero, maximized view, detail page). */
  surfaceDpr: number;
  /** DPR for gallery cards on the shared context. */
  cardDpr: number;
  /** Frame-rate cap for gallery cards; 0 follows the display. */
  cardFps: number;
  /** How many gallery cards may animate at once. */
  maxActiveCards: number;
}

export interface DeviceSignals {
  saveData?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  coarsePointer?: boolean;
  /** Explicit user choice; wins over every heuristic. */
  userLowPower?: boolean | null;
}

export const LOW_POWER_STORAGE_KEY = "shadeon:low-power";

/** Pure so it can be unit-tested; `readDeviceSignals` supplies the browser values. */
export function profileFor(signals: DeviceSignals): DeviceProfile {
  const weak =
    signals.saveData === true ||
    (signals.deviceMemory !== undefined && signals.deviceMemory <= 4) ||
    (signals.hardwareConcurrency !== undefined && signals.hardwareConcurrency <= 4);
  const lowPower = signals.userLowPower ?? weak;
  if (lowPower) {
    return { lowPower: true, surfaceDpr: 1.5, cardDpr: 1, cardFps: 30, maxActiveCards: 4 };
  }
  if (signals.coarsePointer) {
    return { lowPower: false, surfaceDpr: 2, cardDpr: 1, cardFps: 30, maxActiveCards: 6 };
  }
  return { lowPower: false, surfaceDpr: 2, cardDpr: 1, cardFps: 0, maxActiveCards: 12 };
}

export function readDeviceSignals(): DeviceSignals {
  if (typeof navigator === "undefined") return {};
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  let userLowPower: boolean | null = null;
  try {
    const stored = localStorage.getItem(LOW_POWER_STORAGE_KEY);
    if (stored === "1") userLowPower = true;
    if (stored === "0") userLowPower = false;
  } catch {
    // Storage can be blocked; fall back to heuristics.
  }
  return {
    saveData: nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    hardwareConcurrency: nav.hardwareConcurrency,
    coarsePointer: typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches,
    userLowPower,
  };
}

let cached: DeviceProfile | null = null;

export function getDeviceProfile(): DeviceProfile {
  cached ??= profileFor(readDeviceSignals());
  return cached;
}
