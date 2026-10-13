import {
  EyeSlashIcon,
  FileCodeIcon,
  GaugeIcon,
  ImageIcon,
  PersonSimpleWalkIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/ssr";
import { LiveReadout } from "./live-readout";

const groups = [
  {
    title: "Light on the page",
    items: [
      { icon: FileCodeIcon, text: "No dependencies. Each export is one self-contained file." },
      { icon: SquaresFourIcon, text: "One WebGL context draws every card in the gallery." },
      {
        icon: EyeSlashIcon,
        text: "Shaders stop when they scroll out of view or the tab is hidden.",
      },
    ],
  },
  {
    title: "Considerate by default",
    items: [
      {
        icon: PersonSimpleWalkIcon,
        text: "Reduced motion is respected with a single still frame.",
      },
      { icon: GaugeIcon, text: "Resolution steps down by itself if frames start to drop." },
      { icon: ImageIcon, text: "Without WebGL, a static gradient takes its place." },
    ],
  },
];

/** Two short groups of claims, each of which the engine actually implements, plus a live measurement. */
export function Quality() {
  return (
    <section aria-labelledby="quality-title" className="border-line border-t">
      <div className="shell flex flex-col gap-12 py-20 md:py-28">
        <h2
          id="quality-title"
          className="reveal max-w-[20ch] text-3xl leading-tight font-semibold tracking-tight md:text-5xl"
        >
          Fast for the page, kind to the visitor.
        </h2>
        <div className="grid gap-x-16 gap-y-12 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title} className="reveal flex flex-col gap-5">
              <h3 className="text-text-muted text-lg font-medium">{group.title}</h3>
              <ul className="flex flex-col gap-5">
                {group.items.map((item) => (
                  <li key={item.text} className="flex gap-4">
                    <item.icon
                      size={22}
                      aria-hidden="true"
                      className="text-text-faint mt-0.5 shrink-0"
                    />
                    <span className="max-w-[40ch] text-lg leading-snug">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="reveal">
          <LiveReadout />
        </div>
      </div>
    </section>
  );
}
