import { ShaderCard } from "@/components/shader/shader-card";
import type { ShaderMeta } from "@/shaders/schema";

interface GalleryGridProps {
  shaders: readonly ShaderMeta[];
  onOpen?: (id: string, withCode: boolean) => void;
}

/** The card grid. Rendered on the server as the fallback, and by the client gallery. */
export function GalleryGrid({ shaders, onOpen }: GalleryGridProps) {
  return (
    <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {shaders.map((shader) => (
        <li key={shader.id}>
          <ShaderCard
            shader={shader}
            surfaceClassName="aspect-[4/3]"
            onOpen={onOpen}
            // The gallery has no section headings: cards sit directly under the h1.
            headingLevel={2}
          />
        </li>
      ))}
    </ul>
  );
}
