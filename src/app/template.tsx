import { ViewTransition, type ReactNode } from "react";

/**
 * Page transitions. A template re-mounts on every navigation between routes,
 * so its ViewTransition plays the old page out and the new one in (the
 * page-out and page-in classes in globals.css). The first load is not a
 * transition, so nothing animates and the headline paints at once. The header
 * and footer sit outside and stay put.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
