import { posterBackground } from "@/shaders/poster";

/** Open Graph image size, used by every generated card. */
export const OG_SIZE = { width: 1200, height: 630 };

/**
 * The shared-link card: a shader's colours as a soft gradient (the same CSS
 * poster the site paints before WebGL starts), with a title and a line of
 * text on a scrim, in the site's own dark style. Rendered by next/og, which
 * supports a subset of CSS: every element is flex, and sizes are in pixels.
 */
export function OgCard({
  colors,
  title,
  kicker,
  line,
}: {
  colors: readonly string[];
  title: string;
  kicker: string;
  line: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        backgroundColor: colors[0] ?? "#0a0b0d",
        backgroundImage: posterBackground(colors),
        color: "#f3f4f6",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "56px 72px 64px",
          backgroundImage: "linear-gradient(to bottom, rgba(10,11,13,0), rgba(10,11,13,0.88) 45%)",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, opacity: 0.8, letterSpacing: 1 }}>
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -2,
            lineHeight: 1.05,
            marginTop: 12,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 30, opacity: 0.85, marginTop: 20, maxWidth: 940 }}>
          {line}
        </div>
      </div>
    </div>
  );
}
