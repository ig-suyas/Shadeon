import type { ShaderMeta } from "@/shaders/schema";
import { TuneDemo } from "./tune-demo";

const steps = [
  {
    title: "Pick",
    body: "Find a look in the gallery and open it full size.",
  },
  {
    title: "Tune",
    body: "Change colours, speed, scale and seed. Presets give you a starting point.",
  },
  {
    title: "Copy",
    body: "Take it as a React component, plain JavaScript or raw GLSL. There is no package to install.",
  },
];

/** The three steps on the left; a working miniature of them on the right. */
export function HowItWorks({ shaders }: { shaders: ShaderMeta[] }) {
  return (
    <section aria-labelledby="how-title" className="border-line border-t">
      <div className="shell grid gap-12 py-20 md:py-28 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="reveal flex flex-col gap-10">
          <h2
            id="how-title"
            className="text-3xl leading-tight font-semibold tracking-tight md:text-5xl"
          >
            Pick, tune, copy.
          </h2>
          <ol className="flex flex-col gap-8">
            {steps.map((step) => (
              <li key={step.title} className="flex flex-col gap-2">
                <h3 className="text-xl font-medium">{step.title}</h3>
                <p className="text-text-muted max-w-[42ch] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="reveal min-w-0">
          <TuneDemo shaders={shaders} />
        </div>
      </div>
    </section>
  );
}
