/**
 * Nebula — animated GPU background (Three.js TSL / WebGPU).
 * Deep-space clouds lit from within, dusted with a field of stars.
 *
 * Ported from https://github.com/franciscohermida/tsl-bg-shaders (effects/nebula.js),
 * adapted to TypeScript. Runs as a top-level module against the persistent
 * `<canvas id="shaders">` and pauses on still routes / reduced-motion.
 *
 * Needs WebGPU (Chrome/Edge/Firefox); falls back to WebGL2 automatically.
 */
import {
  WebGPURenderer,
  Scene,
  PerspectiveCamera,
  Color,
  type Node
} from "three/webgpu";
import {
  Fn,
  vec2,
  vec3,
  mix,
  smoothstep,
  step,
  screenUV,
  screenSize,
  uniform,
  mx_fractal_noise_float,
  add,
  sub,
  mul,
  div,
  dot,
  fract,
  floor,
  sin,
  exp,
  pow,
  clamp,
  negate,
  oneMinus,
  abs
} from "three/tsl";

// Configuration for this site's background.
const config = {
  speed: 0.29,
  scale: 0.98,
  warp: 0.15,
  stars: 0.23,
  grain: 0.29,
  // How much per-star hue variation to apply (0 = uniform white stars,
  // like the bare Nebula; ~0.45 ≈ the previous shader's colored stars).
  starSat: 0.45
} as const;

// Cosmic density ramp: void → royal purple → magenta → warm core.
// These are the reference Nebula palette; tune via the dev control panel.
// Exposed as Color uniforms so the palette can be tuned at runtime.
const palette = {
  void: "#05030f",
  mid: "#3a1d6e",
  hot: "#b14fb0",
  core: "#ffd6a5"
} as const;

// fbm octave counts dominate GPU cost (each octave is a full 3D noise eval).
// Kept at the reference Nebula's values for fidelity; the 30fps render cap is
// the primary perf lever. These are compile-time (baked into the node graph),
// so changing them in the dev panel rebuilds the background node.
const octaves = {
  density: 6,
  warp: 4
};

// TSL operations are written with the free-function operators (add/mul/…)
// rather than method chaining: chaining narrows the inferred node type and
// fights TypeScript, while the free functions accept and return loose nodes.

// ── inlined helpers (only what this effect uses) ──
// `Node<"vecN">` is the swizzle-able proxied node type (it carries .x/.toVar/
// .mul extensions); bare `Node` does not, so always parameterize it.
const hash21 = Fn(([p_in]: [Node<"vec2">]): Node<"float"> => {
  const p = fract(mul(p_in, vec2(0.3183099, 0.3678794)));
  const p2 = add(p, 0.1).toVar();
  p2.addAssign(dot(p2, add(p2, 19.19)));
  return fract(mul(p2.x, p2.y));
});

const fbm = (
  p: Node<"vec3">,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): Node<"float"> => mx_fractal_noise_float(p, octaves, lacunarity, gain);

const fbm01 = (
  p: Node<"vec3">,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): Node<"float"> => add(mul(fbm(p, octaves, lacunarity, gain), 0.5), 0.5);

const screenPos = (): Node<"vec2"> =>
  mul(sub(screenUV, 0.5), vec2(div(screenSize.x, screenSize.y), 1));

// HSV → RGB (smooth, branchless). Used to give each star its own subtle hue,
// like the previous shader's warm/cool star variation.
const hsv2rgb = Fn(([c]: [Node<"vec3">]): Node<"vec3"> => {
  const p = abs(
    sub(mul(fract(add(c.xxx, vec3(1.0, 2.0 / 3.0, 1.0 / 3.0))), 6.0), 3.0)
  );
  return mul(c.z, mix(vec3(1.0), clamp(sub(p, 1.0), 0.0, 1.0), c.y));
});

// Animation clock, advanced each frame in the render loop.
const time = uniform(0);

const u = {
  speed: uniform(config.speed),
  scale: uniform(config.scale),
  warp: uniform(config.warp),
  stars: uniform(config.stars),
  grain: uniform(config.grain),
  starSat: uniform(config.starSat),
  cVoid: uniform(new Color(palette.void)),
  cMid: uniform(new Color(palette.mid)),
  cHot: uniform(new Color(palette.hot)),
  cCore: uniform(new Color(palette.core))
};

const buildColorNode = (): Node<"vec3"> => {
  const pix = (): Node<"vec2"> => mul(screenUV, screenSize);
  const t = mul(time, u.speed);
  const p = mul(screenPos(), u.scale);

  const w = mul(fbm(vec3(p, mul(t, 0.05)), octaves.warp), u.warp);
  const q = add(
    p,
    vec2(w, mul(fbm(vec3(add(p, 3.7), mul(t, 0.06)), octaves.warp), u.warp))
  );
  const density = pow(fbm01(vec3(q, mul(t, 0.04)), octaves.density), 1.8);

  // controlled cosmic ramp: void → royal blue → magenta → mauve core
  const ramp1 = mix(u.cVoid, u.cMid, smoothstep(0.0, 0.45, density));
  const ramp2 = mix(ramp1, u.cHot, smoothstep(0.42, 0.8, density));
  const baseCol = mix(ramp2, u.cCore, smoothstep(0.82, 1.0, density));

  // Star field: each cell hosts at most one star at a RANDOM position, with
  // independent brightness, size and twinkle phase drawn from separate hashes
  // — so no grid pattern and no synchronised blinking.
  const cell = div(pix(), 13.0);
  const id = floor(cell);
  const hPresent = hash21(id);
  const hx = hash21(add(id, 31.7));
  const hy = hash21(add(id, 67.3));
  const hr = hash21(add(id, 11.1)); // size / phase
  const present = step(0.8, hPresent); // ~20% of cells
  const local = sub(fract(cell), vec2(hx, hy)); // random position in cell
  const sizeV = mix(0.6, 1.9, hr);
  const shape = exp(negate(mul(dot(local, local), mul(sizeV, 70.0))));
  const bright = mix(0.2, 1.0, hx); // dim → bright stars
  const twinkle = add(mul(sin(add(mul(t, 2.2), mul(hr, 120.0))), 0.4), 0.6);
  const star = mul(
    mul(mul(present, shape), mul(bright, twinkle)),
    pow(clamp(oneMinus(density), 0, 1), 2.0)
  );

  // Per-star tint: a hashed hue biased toward warm amber / cool blue, kept
  // near-white via low saturation — mirrors the old shader's colored stars.
  const starHue = hash21(add(id, 5.3));
  const starTint = hsv2rgb(
    vec3(add(0.55, mul(sub(starHue, 0.5), 0.5)), u.starSat, 1.0)
  );
  const starCol = add(baseCol, mul(mul(mul(star, u.stars), 1.6), starTint));

  // film grain — multiplicative, so the voids stay black instead of fogging
  const grain = add(
    mul(sub(hash21(floor(pix())), 0.5), mul(u.grain, 0.6)),
    1.0
  );
  return mul(starCol, grain);
};

const canvas = document.getElementById("shaders");
if (!(canvas instanceof HTMLCanvasElement)) {
  throw new Error("Nebula shader: #shaders canvas not found");
}

interface NebulaDevHandle {
  uniforms: typeof u;
  octaves: typeof octaves;
  rebuild(): void;
}

declare global {
  // Dev-only handles for the ShaderControls panel and live tuning.
  // eslint-disable-next-line no-var
  var __nebula: NebulaDevHandle | undefined;
  // eslint-disable-next-line no-var
  var __renderer: WebGPURenderer | undefined;
}

const scene = new Scene();
scene.backgroundNode = buildColorNode();

if (import.meta.env.DEV) {
  globalThis.__nebula = {
    uniforms: u,
    octaves,
    // Octaves are compile-time; rebuild the node graph to apply a change.
    rebuild: (): void => {
      scene.backgroundNode = buildColorNode();
    }
  };
}

const camera = new PerspectiveCamera(50, 1, 0.1, 10);

const renderer = new WebGPURenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

if (import.meta.env.DEV) {
  globalThis.__renderer = renderer;
}

// Pause animation on routes that should be still, or when the user prefers
// reduced motion. When paused we stop advancing `time`, freezing the frame.
const stillRoutes = ["/about", "/guide"];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let paused = false;

const shouldPause = (): boolean =>
  reducedMotion.matches || stillRoutes.includes(window.location.pathname);

// Cap the render rate. This is a low-motion background running mostly on
// mobile, so ~30fps looks identical to 120 while drawing a quarter as often.
const targetFps = 30;
const frameInterval = 1000 / targetFps;

let last = performance.now();
let lastRender = 0;
function animate(): void {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  if (paused) return;
  // Advance the clock every rAF so motion rate stays correct, but only draw
  // once per frame interval.
  time.value += dt;
  if (now - lastRender < frameInterval) return;
  lastRender = now;
  renderer.render(scene, camera);
}

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}
window.addEventListener("resize", resize);

function syncPaused(): void {
  // Reset the clock anchor on resume so paused wall-time doesn't jump time.
  last = performance.now();
  paused = shouldPause();
}

// Astro keeps the canvas across client-side navigations (`transition:persist`),
// so re-evaluate the pause state on each navigation.
document.addEventListener("astro:page-load", syncPaused);
document.addEventListener("astro:after-swap", syncPaused);
reducedMotion.addEventListener("change", syncPaused);

async function start(): Promise<void> {
  try {
    await renderer.init();
    resize();
    syncPaused();
    last = performance.now();
    animate();
  } catch (error: unknown) {
    console.error("Nebula shader initialization failed:", error);
  }
}

void start();
