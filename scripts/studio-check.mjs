// Drives a studio shader on /dev/studio and photographs each stage of the
// interaction, so feel can be judged frame by frame without a live window:
//   node scripts/studio-check.mjs <id> [groups]
// groups (comma list, default all): desktop, touch, light, card, reduced, gpu
// writes .shots/studio/<id>-<step>.png and prints the GPU renderer, console
// errors and how many animation frames ran at rest (should be none).
// Needs the dev server on http://localhost:3000 (or SHOOT_URL).
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const [id = "lodestone", only = ""] = process.argv.slice(2);
const steps = only ? only.split(",") : null;
const want = (name) => !steps || steps.includes(name);
const base = process.env.SHOOT_URL ?? "http://localhost:3000";
const out = resolve(process.cwd(), ".shots/studio");
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"],
});
const errors = [];
let stage = "load";

// Counts requestAnimationFrame callbacks, so a settled surface can be proven idle.
const countFrames = () => {
  window.__frames = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf((t) => {
      window.__frames++;
      cb(t);
    });
  // Report context loss and restore (the core must survive both).
  addEventListener(
    "webglcontextlost",
    (e) =>
      console.warn(
        "event: webglcontextlost on " +
          (e.target?.closest?.("[data-shader]")?.getAttribute("data-shader") ?? "detached canvas"),
      ),
    true,
  );
  addEventListener("webglcontextrestored", () => console.warn("event: webglcontextrestored"), true);
  // Report any loseContext() on a context that is already lost, with a stack.
  const proto = WebGL2RenderingContext.prototype;
  const getExtension = proto.getExtension;
  proto.getExtension = function (name) {
    const ext = getExtension.call(this, name);
    if (name === "WEBGL_lose_context" && ext && !ext.__wrapped) {
      ext.__wrapped = true;
      const lose = ext.loseContext.bind(ext);
      ext.loseContext = () => {
        if (this.isContextLost()) console.warn("loseContext on a lost context" + new Error().stack);
        lose();
      };
    }
    return ext;
  };
};

async function open(options = {}, query = "") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    ...options,
  });
  const page = await context.newPage();
  await page.addInitScript(countFrames);
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      errors.push(`[${m.type()} @${stage}] ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(`${base}/dev/studio?id=${id}${query}`);
  await page.waitForSelector(`[data-shader="${id}"][data-status="live"]`, { timeout: 90_000 });
  return { context, page };
}

const shot = async (page, name) => {
  stage = name;
  // Headless GPU capture fails now and then while frames are in flight: retry.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await page.screenshot({ path: resolve(out, `${id}-${name}.png`), timeout: 4000 });
      console.log(`  ${name}`);
      return;
    } catch {
      await page.waitForTimeout(30);
    }
  }
  console.log(`  ${name}: capture failed`);
};
const wait = (page, ms) => page.waitForTimeout(ms);
const framesOver = async (page, ms) => {
  const a = await page.evaluate(() => window.__frames);
  await wait(page, ms);
  return (await page.evaluate(() => window.__frames)) - a;
};

// --- desktop pointer ---------------------------------------------------------
if (want("desktop")) {
  const { context, page } = await open();
  const renderer = await page.evaluate(() => {
    // The surface's own context: a throwaway canvas would be collected and lost mid-run.
    const gl = document.querySelector("[data-engine=studio] canvas")?.getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl ? gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) : "no webgl2";
  });
  console.log(`renderer: ${renderer}`);
  await wait(page, 900);
  await shot(page, "intro");
  await wait(page, 5200);
  await shot(page, "after-intro");

  const W = 1280;
  const H = 800;
  await page.mouse.move(W * 0.2, H * 0.55);
  await page.mouse.move(W * 0.5, H * 0.5, { steps: 40 });
  await wait(page, 1400);
  await shot(page, "rest");
  console.log(`  frames/s while resting: ${await framesOver(page, 1000)}`);

  await page.mouse.move(W * 0.85, H * 0.42, { steps: 8 });
  await shot(page, "fast");
  await wait(page, 350);
  await shot(page, "fast-trail");
  await wait(page, 1200);

  await page.mouse.move(W * 0.45, H * 0.55, { steps: 20 });
  await wait(page, 900);
  await page.mouse.down();
  await page.mouse.up();
  await wait(page, 120);
  await shot(page, "burst-1");
  await wait(page, 330);
  await shot(page, "burst-2");

  // Leave: the pointer exits the surface.
  await page.mouse.move(W * 0.45, H * 0.995, { steps: 6 });
  await page.evaluate(() => {
    document
      .querySelector("[data-engine=studio]")
      ?.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse", bubbles: false }));
  });
  await wait(page, 900);
  await shot(page, "leaving");
  await wait(page, 7000);
  await shot(page, "settled");
  console.log(`  frames/s after settling: ${await framesOver(page, 1000)}`);
  stage = "closing";
  await context.close();
}

// --- touch ----------------------------------------------------------------
if (want("touch")) {
  const { context, page } = await open({
    viewport: { width: 390, height: 780 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  await wait(page, 4500);
  const cdp = await context.newCDPSession(page);
  const touch = (type, x, y) =>
    cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await touch("touchStart", 80, 420);
  for (let i = 1; i <= 24; i++) {
    await touch("touchMove", 80 + i * 10, 420 - i * 2);
    await wait(page, 16);
  }
  await wait(page, 500);
  await shot(page, "touch");
  await touch("touchEnd", 0, 0);
  await wait(page, 800);
  await shot(page, "touch-release");
  await context.close();
}

// --- light theme, card still, reduced motion --------------------------------
if (want("light")) {
  const { context, page } = await open({ colorScheme: "light" });
  await wait(page, 5200);
  await page.mouse.move(400, 420);
  await page.mouse.move(640, 400, { steps: 30 });
  await wait(page, 1300);
  await shot(page, "light");
  await context.close();
}
if (want("card")) {
  const { context, page } = await open({ viewport: { width: 480, height: 300 } }, "&mode=shared");
  await wait(page, 800);
  await shot(page, "card");
  await context.close();
}
if (want("reduced")) {
  const { context, page } = await open({ reducedMotion: "reduce" });
  await wait(page, 800);
  await shot(page, "reduced");
  console.log(`  frames/s under reduced motion: ${await framesOver(page, 1000)}`);
  await context.close();
}

// --- GPU time per pass (EXT_disjoint_timer_query_webgl2) -------------------
if (want("gpu")) {
  for (const [w, h, dsf] of [
    [1280, 800, 1],
    [1440, 900, 2],
  ]) {
    const { context, page } = await open({
      viewport: { width: w, height: h },
      deviceScaleFactor: dsf,
    });
    await page.evaluate(() => {
      window.__gpu = {};
      const P = WebGL2RenderingContext.prototype;
      for (const name of [
        "drawElements",
        "drawArrays",
        "drawArraysInstanced",
        "drawElementsInstanced",
      ]) {
        const orig = P[name];
        P[name] = function (...args) {
          const ext =
            this.__timer ?? (this.__timer = this.getExtension("EXT_disjoint_timer_query_webgl2"));
          if (!ext || this.__timing) return orig.apply(this, args);
          const label = `${name}#${(this.__drawIndex = (this.__drawIndex ?? 0) + 1)}`;
          const q = this.createQuery();
          this.__timing = true;
          this.beginQuery(ext.TIME_ELAPSED_EXT, q);
          orig.apply(this, args);
          this.endQuery(ext.TIME_ELAPSED_EXT);
          this.__timing = false;
          (this.__pending ??= []).push([label, q]);
        };
      }
      const poll = () => {
        for (const c of document.querySelectorAll("canvas")) {
          const gl = c.getContext("webgl2");
          if (!gl?.__pending) continue;
          gl.__drawIndex = 0;
          gl.__pending = gl.__pending.filter(([label, q]) => {
            if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) return true;
            const key = label.replace(/#d+$/, "") + " " + label.split("#")[1];
            (window.__gpu[key] ??= []).push(gl.getQueryParameter(q, gl.QUERY_RESULT) / 1e6);
            gl.deleteQuery(q);
            return false;
          });
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });
    await page.mouse.move(w * 0.3, h * 0.5);
    await page.mouse.move(w * 0.5, h * 0.5, { steps: 30 });
    await page.mouse.move(w * 0.7, h * 0.45, { steps: 30 });
    await wait(page, 1500);
    const result = await page.evaluate(() => {
      const c = document.querySelector("[data-engine=studio] canvas");
      const rows = Object.entries(window.__gpu).map(([k, a]) => {
        a.sort((x, y) => x - y);
        return `${k}: median ${a[Math.floor(a.length / 2)].toFixed(2)} ms, p95 ${a[Math.floor(a.length * 0.95)].toFixed(2)} ms (n=${a.length})`;
      });
      return [`buffer ${c.width}x${c.height}`, ...rows];
    });
    console.log(`  gpu ${w}x${h}@${dsf}`);
    for (const row of result) console.log(`    ${row}`);
    await context.close();
  }
}

await browser.close();
console.log(errors.length ? `console:\n${errors.join("\n")}` : "console: clean");
