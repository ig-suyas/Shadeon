import type { Metadata } from "next";
import { Closing } from "@/components/landing/closing";
import { Community } from "@/components/landing/community";
import { Featured } from "@/components/landing/featured";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Quality } from "@/components/landing/quality";
import { getShader, shaders } from "@/shaders/registry";

export const metadata: Metadata = {
  title: { absolute: "Shadeon: animated shaders, ready to paste" },
  description:
    "A free library of original animated WebGL shaders. Tune one live, then copy it as a React component, plain JavaScript or raw GLSL.",
};

export default function Home() {
  const hero = getShader("mesh-drift");
  const closing = getShader("contour-field");
  const featured = [
    getShader("aurora-veil"),
    getShader("contour-field"),
    getShader("mesh-drift"),
  ].filter((shader) => shader !== undefined);

  return (
    <main id="main" className="flex flex-1 flex-col">
      {hero ? <Hero shader={hero} /> : null}
      <Featured shaders={featured} />
      <HowItWorks shaders={[...shaders]} />
      <Quality />
      <Community />
      {closing ? <Closing shader={closing} /> : null}
    </main>
  );
}
