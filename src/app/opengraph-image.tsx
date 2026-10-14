import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard } from "@/lib/og-card";
import { getShader } from "@/shaders/registry";

export const alt = "Shadeon: animated shaders, ready to paste";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The site's card: the hero shader's colours behind the name and promise. */
export default function Image() {
  const hero = getShader("mesh-drift");
  return new ImageResponse(
    <OgCard
      colors={hero?.colors.default ?? []}
      kicker="shadeon"
      title="Animated shaders, ready to paste."
      line="Free WebGL backgrounds. Tune one live, copy it as React, JavaScript or GLSL."
    />,
    size,
  );
}
