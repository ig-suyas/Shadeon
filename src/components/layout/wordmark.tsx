/**
 * The mark is a single square split on the diagonal: light on one half, shade
 * on the other. It takes its colours from the hero palette tokens.
 */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="size-[18px] rounded-[4px]"
        style={{
          background:
            "linear-gradient(135deg, var(--hero-2) 0%, var(--hero-1) 50%, var(--hero-3) 50%, var(--hero-3) 100%)",
        }}
      />
      <span className="text-[17px] font-semibold tracking-tight">Shadeon</span>
    </span>
  );
}
