/**
 * The Shadeon mark: a disc cut in two by one smooth wave, a shader in its
 * simplest form (a field split by a curve). It is drawn in the text colour,
 * so it is monochrome in both themes and works at any size; the cut is a mask,
 * so whatever is behind the logo shows through it.
 */
export function Mark({ id, size = 20 }: { id: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <defs>
        <mask id={id}>
          <rect width="24" height="24" fill="white" />
          <path
            d="M-1 13.2C3.2 13.2 5.6 7.6 9.6 7.6S16 16.4 20.4 16.4 25 12 25 12"
            fill="none"
            stroke="black"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </mask>
      </defs>
      <circle cx="12" cy="12" r="11" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  );
}

/** `id` must be unique on the page (the header and the footer each have one). */
export function Wordmark({ id }: { id: string }) {
  return (
    <span className="text-text flex items-center gap-2">
      <Mark id={id} />
      <span className="text-[17px] font-semibold tracking-[-0.03em]">Shadeon</span>
    </span>
  );
}
