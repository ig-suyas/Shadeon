import type { BeforeSendEvent } from "@vercel/analytics/next";
import { describe, expect, it } from "vitest";
import { scrubAnalyticsEvent } from "@/components/layout/site-analytics";
import { LEGAL, PLACEHOLDER, RETENTION, unresolvedLegalFields } from "../legal";

const view = (url: string): BeforeSendEvent => ({ type: "pageview", url });

describe("analytics scrubbing", () => {
  it("never reports the waitlist token pages", () => {
    const token = "A".repeat(43);
    expect(scrubAnalyticsEvent(view(`https://shadeon.dev/waitlist/confirm?token=${token}`))).toBe(
      null,
    );
    expect(
      scrubAnalyticsEvent(view(`https://shadeon.dev/waitlist/unsubscribe?token=${token}`)),
    ).toBe(null);
  });

  it("strips query strings and fragments from every other page", () => {
    expect(
      scrubAnalyticsEvent(view("https://shadeon.dev/shaders?q=secret+search&s=mesh-drift#code")),
    ).toEqual(view("https://shadeon.dev/shaders"));
    expect(
      scrubAnalyticsEvent(view("https://shadeon.dev/shaders/mesh-drift?c=ff0000&speed=2")),
    ).toEqual(view("https://shadeon.dev/shaders/mesh-drift"));
    expect(scrubAnalyticsEvent(view("https://shadeon.dev/"))).toEqual(view("https://shadeon.dev/"));
  });

  it("drops events it cannot parse instead of sending them unchanged", () => {
    expect(scrubAnalyticsEvent(view("not a url"))).toBe(null);
  });
});

describe("legal facts", () => {
  it("detects placeholders", () => {
    expect(PLACEHOLDER.test("[Operator legal name]")).toBe(true);
    expect(PLACEHOLDER.test("Example Studio Ltd")).toBe(false);
  });

  it("stays marked as a draft while any placeholder remains", () => {
    // Guards against flipping `draft` off before the placeholders are filled in.
    if (unresolvedLegalFields().length > 0) expect(LEGAL.draft).toBe(true);
  });

  it("has sane retention periods", () => {
    expect(RETENTION.unconfirmedWaitlistDays).toBeGreaterThanOrEqual(7);
    expect(RETENTION.messagesMonths).toBeGreaterThan(0);
    expect(/^\d{4}-\d{2}-\d{2}$/.test(LEGAL.updated)).toBe(true);
  });
});
