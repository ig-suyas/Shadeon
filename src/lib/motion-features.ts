/**
 * Motion's layout-animation features, loaded on demand by
 * `<LazyMotion features={loadLayoutFeatures}>` so the bundle that first
 * renders a component never carries them (context.md section 4.2).
 */
export const loadLayoutFeatures = () => import("motion/react").then((module) => module.domMax);
