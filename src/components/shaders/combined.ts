import {
  Renderer,
  Program,
  Mesh,
  Color,
  Triangle,
  Texture,
  type OGLRenderingContext
} from "ogl";

const vertexShader = /* glsl*/ `#version 300 es
  in vec2 position;
  in vec2 uv;

  out vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl*/ `#version 300 es
  precision highp float;
  precision highp int;

  uniform float uTime;
  uniform vec3 uResolution;
  uniform vec2 uFocal;
  uniform vec2 uRotation;
  uniform float uStarSpeed;
  uniform float uDensity;
  uniform float uHueShift;
  uniform float uSpeed;
  uniform float uGlowIntensity;
  uniform float uSaturation;
  uniform float uTwinkleIntensity;
  uniform float uRotationSpeed;
  uniform float uAutoCenterRepulsion;
  
  // Aurora uniforms
  uniform float uAuroraIntensity;
  uniform float uAuroraSpeed;
  uniform int uColorCount;
  uniform float uDistort;
  uniform vec2 uOffset;
  uniform sampler2D uGradient;
  uniform float uNoiseAmount;
  uniform int uRayCount;

  in vec2 vUv;
  out vec4 fragColor;

  #define NUM_LAYER 4.0
  #define STAR_COLOR_CUTOFF 0.2
  #define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
  #define PERIOD 3.0
  #define PI 3.14159
  #define INV_PI 0.31831

  // Precomputed constants
  const float hueShiftNorm = 1.0 / 360.0;
  const vec3 lumCoeff = vec3(0.299, 0.587, 0.114);
  const vec2 hashMult = vec2(123.34, 456.21);
  const mat2 ROT30 = mat2(0.8, -0.5, 0.5, 0.8);
  const float INV_255 = 1.0 / 255.0;
  const vec2 HASH_CONST = vec2(0.065, 0.005);
  const float HASH_MULT = 52.9829189;

  float Hash21(vec2 p) {
    p = fract(p * hashMult);
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Optimized triangle wave using mad operations
  float tri(float x) {
    float t = fract(x);
    return abs(t + t - 1.0);
  }

  float tris(float x) {
    float t = fract(x);
    float at = abs(t + t - 1.0);
    return 1.0 - at * at;
  }

  float trisn(float x) {
    float t = fract(x);
    float at = abs(t + t - 1.0);
    return 2.0 * (1.0 - at * at) - 1.0;
  }

  // Faster HSV to RGB conversion with fewer branches
  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0) - 1.0;
    return c.z * mix(vec3(1.0), clamp(p, 0.0, 1.0), c.y);
  }

  float Star(vec2 uv, float flare, float glowMult) {
    float d = length(uv);
    
    // Early exit for distant stars
    if (d > 1.0) return 0.0;
    
    float m = glowMult / (d + 0.001);
    
    // Combine both ray calculations into one
    float rays1 = 1.0 - abs(uv.x * uv.y * 1000.0);
    vec2 rotUv = uv * MAT45;
    float rays2 = 1.0 - abs(rotUv.x * rotUv.y * 1000.0);
    
    rays1 = clamp(rays1, 0.0, 1.0);
    rays2 = clamp(rays2, 0.0, 1.0);
    
    m += (rays1 + rays2 * 0.3) * flare * glowMult;
    m *= smoothstep(1.0, 0.2, d);
    return m;
  }

  vec3 StarLayer(vec2 uv) {
    vec3 col = vec3(0.0);
    
    vec2 gv = fract(uv) - 0.5; 
    vec2 id = floor(uv);
    
    // Precompute time-based values
    float timeSpeedDiv10 = uTime * uSpeed * 0.1;
    float timeSpeedDiv30 = uTime * uSpeed / 30.0;
    float twinkleTime = uTime * uSpeed;
    
    // Unroll the 3x3 loop for better performance
    for (int i = 0; i < 9; i++) {
      vec2 offset = vec2(float(i % 3 - 1), float(i / 3 - 1));
      vec2 si = id + offset;
      
      float seed = Hash21(si);
      float size = fract(seed * 345.32);
      
      if (size < 0.1) continue;
      
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
      
      vec2 colorSeeds = vec2(Hash21(si + 1.0), Hash21(si + 3.0));
      vec2 redBlu = smoothstep(STAR_COLOR_CUTOFF, 1.0, colorSeeds) + STAR_COLOR_CUTOFF;
      float grn = min(redBlu.x, redBlu.y) * seed;
      vec3 base = vec3(redBlu.x, grn, redBlu.y);
      
      float hue = atan(grn - redBlu.x, redBlu.y - redBlu.x) * INV_PI * 0.5 + 0.5;
      hue = fract(hue + uHueShift * hueShiftNorm);
      float sat = length(base - vec3(dot(base, lumCoeff))) * uSaturation;
      float val = max(redBlu.x, max(grn, redBlu.y));
      base = hsv2rgb(vec3(hue, sat, val));
      
      vec2 pad = vec2(
        tris(seed * 34.0 + timeSpeedDiv10), 
        tris(seed * 38.0 + timeSpeedDiv30)
      ) - 0.5;
      
      float star = Star(gv - offset - pad, flareSize, 0.05 * uGlowIntensity);
      
      if (star < 0.001) continue;
      
      float twinkle = trisn(twinkleTime + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      
      col += star * size * base * twinkle;
    }
    
    return col;
  }

  // Aurora functions
  mat3 rotX(float a){
    float c = cos(a), s = sin(a);
    return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c);
  }
  mat3 rotY(float a){
    float c = cos(a), s = sin(a);
    return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c);
  }
  mat3 rotZ(float a){
    float c = cos(a), s = sin(a);
    return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0);
  }

  vec2 rot2(vec2 v, float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * v;
  }

  vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
    float focal = res.y * max(dist, 1e-3);
    return normalize(vec3(2.0 * (frag - offset) - res, focal));
  }

  float bendAngle(vec3 q, float t){
    vec3 phase = vec3(q.x * 0.55 + t * 0.6, q.y * 0.50 - t * 0.5, q.z * 0.60 + t * 0.7);
    vec3 s = sin(phase);
    return dot(s, vec3(0.8, 0.7, 0.6));
  }

  float hash21(vec2 p){
    p = floor(p);
    return fract(HASH_MULT * fract(dot(p, HASH_CONST)));
  }

  float layeredNoise(vec2 fragPx){
    vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 q = ROT30 * p;
    float n = 0.0;
    n += 0.50 * hash21(q);
    n += 0.30 * hash21(q * 2.0 + 17.0);
    n += 0.20 * hash21(q * 4.0 + 47.0);
    return n;
  }

  float edgeFade(vec2 frag, vec2 res, vec2 offset){
    vec2 toC = frag - 0.5 * res - offset;
    float r = length(toC) / (0.5 * min(res.x, res.y));
    float x = clamp(r, 0.0, 1.0);
    float q = x * x * (3.0 - 2.0 * x);
    float s = pow(q * 0.5, 1.5);
    float tail = 1.0 - (1.0 - s) * (1.0 - s);
    s = mix(s, tail, 0.2);
    float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
    return clamp(s + dn, 0.0, 1.0);
  }

  vec3 sampleGradient(float t){
    return texture(uGradient, vec2(clamp(t, 0.0, 1.0), 0.5)).rgb;
  }

  vec3 computeAurora(vec2 fragCoord) {
    vec2 frag = fragCoord;
    float t = uTime * uAuroraSpeed;
    
    vec3 dir = rayDir(frag, uResolution.xy, uOffset, 1.0);
    float marchT = 0.0;
    vec3 col = vec3(0.0);
    
    vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
    mat3 rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
    
    float amp = clamp(uDistort, 0.0, 50.0) * 0.15;
    float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
    float n = layeredNoise(frag);
    float rayCountF = float(uRayCount);
    bool useRayCount = uRayCount > 0;
    bool useUserColors = uColorCount > 0;
    
    for (int i = 0; i < 32; ++i) {
      vec3 P = marchT * dir;
      P.z -= 2.0;
      float rad = length(P);
      
      if (rad > 8.0) break;
      
      vec3 Pl = P * (10.0 / max(rad, 1e-6));
      Pl = rot3dMat * Pl;

      float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;
      float grow = smoothstep(0.35, 3.0, marchT);
      
      float a1 = amp * grow * bendAngle(Pl * 0.6, t);
      float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
      
      vec3 Pb = Pl;
      Pb.xz = rot2(Pb.xz, a1);
      Pb.xy = rot2(Pb.xy, a2);

      float rayPattern = smoothstep(0.5, 0.7,
        sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
        sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
      );

      if (useRayCount) {
        float ang = atan(Pb.y, Pb.x);
        float comb = 0.5 + 0.5 * cos(rayCountF * ang);
        rayPattern *= smoothstep(0.15, 0.95, comb * comb * comb);
      }

      vec3 spectral;
      if (useUserColors) {
        float saw = fract(marchT * 0.25);
        float tRay = saw * saw * (3.0 - 2.0 * saw);
        spectral = 2.0 * sampleGradient(tRay);
      } else {
        float phase = marchT * 3.0;
        spectral = 1.0 + vec3(cos(phase), cos(phase + 1.0), cos(phase + 2.0));
      }
      
      vec3 base = (0.05 / (0.4 + stepLen)) * 
              smoothstep(5.0, 0.0, rad) * 
              spectral;

      col += base * rayPattern;
      marchT += stepLen;
    }

    col *= edgeFade(frag, uResolution.xy, uOffset);
    col *= uAuroraIntensity;
    
    return col;
  }

  void main() {
    vec2 focalPx = uFocal * uResolution.xy;
    vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
    
    // Optimize center repulsion
    if (uAutoCenterRepulsion > 0.0) {
      float centerDist = length(uv);
      if (centerDist > 0.1) {
        vec2 repulsion = uv * (uAutoCenterRepulsion / (centerDist * (centerDist + 0.1)));
        uv += repulsion * 0.05;
      }
    }
    
    // Combine rotations into single matrix multiplication
    float autoRotAngle = uTime * uRotationSpeed;
    float cosAuto = cos(autoRotAngle);
    float sinAuto = sin(autoRotAngle);
    
    mat2 combinedRot = mat2(
      cosAuto * uRotation.x + sinAuto * uRotation.y,
      -cosAuto * uRotation.y + sinAuto * uRotation.x,
      cosAuto * uRotation.y + sinAuto * uRotation.x,
      -cosAuto * uRotation.x + sinAuto * uRotation.y
    );
    
    uv = combinedRot * uv;
    
    // Compute starfield
    vec3 starCol = vec3(0.0);
    const int maxLayers = int(NUM_LAYER);
    float layerStep = 1.0 / NUM_LAYER;
    float speedMult = uStarSpeed * uSpeed;
    
    for (int layerIndex = 0; layerIndex < maxLayers; layerIndex++) {
      float i = float(layerIndex) * layerStep;
      float depth = fract(i + speedMult);
      float scale = mix(20.0, 0.5, depth) * uDensity;
      float fade = depth * smoothstep(1.0, 0.9, depth);
      
      if (fade < 0.01) continue;
      
      starCol += StarLayer(uv * scale + i * 453.32) * fade;
    }
    
    // Compute aurora
    vec3 auroraCol = computeAurora(gl_FragCoord.xy);
    
    // Combine both effects using additive blending
    vec3 finalCol = starCol + auroraCol;
    
    // Calculate alpha for transparency
    float starAlpha = length(starCol);
    starAlpha = smoothstep(0.0, 0.3, starAlpha);
    float auroraAlpha = min(length(auroraCol), 1.0);
    float finalAlpha = max(starAlpha, auroraAlpha);
    
    fragColor = vec4(clamp(finalCol, 0.0, 1.0), finalAlpha);
  }
`;

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.trim();
  if (h.startsWith(`#`)) h = h.slice(1);
  if (h.length === 3) {
    const r = h[0],
      g = h[1],
      b = h[2];
    h = r + r + g + g + b + b;
  }
  const intVal = parseInt(h, 16);
  if (isNaN(intVal) || (h.length !== 6 && h.length !== 8)) return [1, 1, 1];
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  return [r, g, b];
};

const colors = [`#282269`, `#3221e5`, `#9F21E8`, `#DA32F1`, `#D3B8D7`];
const count = colors.length;
const data = new Uint8Array(count * 4);
for (let i = 0; i < count; i++) {
  const [r, g, b] = hexToRgb(colors[i]);
  data[i * 4 + 0] = Math.round(r * 255);
  data[i * 4 + 1] = Math.round(g * 255);
  data[i * 4 + 2] = Math.round(b * 255);
  data[i * 4 + 3] = 255;
}

const starSpeed = 2.5;

export class Shader {
  #renderer = new Renderer({
    alpha: true,
    premultipliedAlpha: false,
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    antialias: false
  });

  get #gl(): OGLRenderingContext {
    return this.#renderer.gl;
  }

  #program = new Program(this.#gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      // Starfield uniforms
      uTime: { value: 0 },
      uResolution: {
        value: new Color(
          this.#gl.canvas.width,
          this.#gl.canvas.height,
          this.#gl.canvas.width / this.#gl.canvas.height
        )
      },
      uFocal: { value: new Float32Array([0.5, 0.5]) },
      uRotation: { value: new Float32Array([1.0, 0.0]) },
      uStarSpeed: { value: starSpeed },
      uDensity: { value: 1.75 },
      uHueShift: { value: 190 },
      uSpeed: { value: 0.025 },
      uGlowIntensity: { value: 0.3 },
      uSaturation: { value: 0.5 },
      uTwinkleIntensity: { value: 0.25 },
      uRotationSpeed: { value: 0.01 },
      uAutoCenterRepulsion: { value: 0 },
      // Aurora uniforms
      uAuroraIntensity: { value: 3.2 },
      uAuroraSpeed: { value: 0.15 },
      uColorCount: { value: count },
      uDistort: { value: 8.2 },
      uOffset: { value: [0, 0] as [number, number] },
      uGradient: {
        value: new Texture(this.#gl, {
          image: data,
          width: count,
          height: 1,
          generateMipmaps: false,
          flipY: false,
          minFilter: this.#gl.LINEAR,
          magFilter: this.#gl.LINEAR,
          wrapS: this.#gl.CLAMP_TO_EDGE,
          wrapT: this.#gl.CLAMP_TO_EDGE,
          format: this.#gl.RGBA,
          type: this.#gl.UNSIGNED_BYTE
        })
      },
      uNoiseAmount: { value: 0.3 },
      uRayCount: { value: 32 }
    }
  });

  #mesh = new Mesh(this.#gl, {
    geometry: new Triangle(this.#gl),
    program: this.#program
  });

  paused = false;
  #animation: number;
  #startTime: number = 0;
  #pausedAt: number = 0;
  #container: HTMLDivElement;
  #canvas: HTMLCanvasElement;
  #observer?: ResizeObserver;
  constructor() {
    const gl = this.#gl;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    this.#container = document.querySelector<HTMLDivElement>(`#shaders`)!;
    this.#canvas = this.#container.appendChild(gl.canvas);

    if (Object.hasOwn(window, `ResizeObserver`)) {
      this.#observer = new ResizeObserver(this.#resize);
      this.#observer.observe(this.#container);
    } else {
      window.addEventListener(`resize`, this.#resize);
    }
    this.#resize();

    requestAnimationFrame(this.#update);
  }

  #resize = (): void => {
    requestIdleCallback(() => {
      const gl = this.#gl;
      const width = this.#container.offsetWidth || 1;
      const height = this.#container.offsetHeight || 1;
      this.#renderer.setSize(width, height);
      this.#program.uniforms.uResolution.value = new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
      );
      this.#renderer.render({ scene: this.#mesh });
    });
  };

  #update = (t: number): void => {
    if (this.paused) {
      return;
    }
    if (!this.#startTime) {
      this.#startTime = t;
    }
    this.#renderer.render({ scene: this.#mesh });
    const elapsedPausedTime = t - this.#pausedAt;
    const elapsed = t - (this.#startTime - elapsedPausedTime);
    const timeInSeconds = elapsed * 0.001;
    this.#program.uniforms.uTime.value = timeInSeconds;
    this.#program.uniforms.uStarSpeed.value =
      (timeInSeconds * starSpeed) / 10.0;

    this.#animation = requestAnimationFrame(this.#update);
  };

  pause = (): void => {
    if (!this.paused) {
      this.paused = true;
      this.#pausedAt = performance.now();
      cancelAnimationFrame(this.#animation);
    }
  };

  resume = (): void => {
    if (this.paused) {
      this.paused = false;
      if (!this.#startTime) {
        this.#startTime =
          performance.now() - (this.#pausedAt - this.#startTime);
      }
      requestAnimationFrame(this.#update);
    }
  };

  cleanup = (): void => {
    cancelAnimationFrame(this.#animation);
    this.#container.removeChild(this.#canvas);
    if (this.#observer) {
      this.#observer.disconnect();
    } else {
      window.removeEventListener(`resize`, this.#resize);
    }
  };
}
