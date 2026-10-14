import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og-card";
import { getShader, shaders } from "@/shaders/registry";

export const alt = "A Shadeon shader";
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams(): { id: string }[] {
  return shaders.map((shader) => ({ id: shader.id }));
}

/** One card per shader, built at build time from its default colours. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shader = getShader(id);
  return new ImageResponse(
    <OgCard
      colors={shader?.colors.default ?? []}
      kicker={shader ? `shadeon · ${shader.category} shader` : "shadeon"}
      title={shader?.name ?? "Shader"}
      line="Free animated WebGL shader. Copy it as React, JavaScript or GLSL."
    />,
    size,
  );
}
