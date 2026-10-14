/**
 * Shown while a page that needs server work is on its way. It mirrors the
 * shape of a content page (title, lead, body) so nothing jumps when the page
 * arrives. It is at least a screen tall: every page is, and a shorter
 * fallback would show the footer, which the real page then pushes away (a
 * layout shift Lighthouse measured on a cold server).
 */
export default function Loading() {
  return (
    <main
      id="main"
      aria-busy="true"
      className="shell min-h-[100dvh] flex-1 pt-[calc(var(--header-height)+3rem)] pb-24"
    >
      <span className="sr-only">Loading</span>
      <div className="flex max-w-[720px] animate-pulse flex-col gap-4 motion-reduce:animate-none">
        <div className="bg-bg-raised rounded-control h-12 w-2/3" />
        <div className="bg-bg-raised rounded-control h-6 w-full" />
        <div className="bg-bg-raised rounded-control h-6 w-4/5" />
        <div className="bg-bg-raised rounded-card mt-8 h-64 w-full" />
      </div>
    </main>
  );
}
