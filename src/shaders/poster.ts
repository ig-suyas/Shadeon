/**
 * A CSS-only stand-in painted before (or instead of) the live shader: on first
 * paint, without WebGL, and while a card is waiting for its turn to render.
 */
export function posterBackground(colors: readonly string[]): string {
  const [base = "#0b0d12", a = base, b = a, c = b] = colors;
  return [
    `radial-gradient(90% 110% at 18% 12%, ${a} 0%, transparent 62%)`,
    `radial-gradient(80% 90% at 86% 88%, ${b} 0%, transparent 58%)`,
    `radial-gradient(60% 70% at 70% 20%, ${c} 0%, transparent 60%)`,
    base,
  ].join(", ");
}
