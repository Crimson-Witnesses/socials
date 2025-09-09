import { Renderer, Program, Mesh, Color, Triangle } from "ogl";

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
    return 1.0 - at * at; // Faster than smoothstep for this case
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
    
    float m = glowMult / (d + 0.001); // Add small epsilon to prevent division by zero
    
    // Combine both ray calculations into one
    float rays1 = 1.0 - abs(uv.x * uv.y * 1000.0);
    vec2 rotUv = uv * MAT45;
    float rays2 = 1.0 - abs(rotUv.x * rotUv.y * 1000.0);
    
    // Use clamp instead of smoothstep for performance
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
      
      // Early skip for small stars
      if (size < 0.1) continue;
      
      float glossLocal = tri(uStarSpeed / (PERIOD * seed + 1.0));
      float flareSize = smoothstep(0.9, 1.0, size) * glossLocal;
      
      // Optimize color calculation
      vec2 colorSeeds = vec2(Hash21(si + 1.0), Hash21(si + 3.0));
      vec2 redBlu = smoothstep(STAR_COLOR_CUTOFF, 1.0, colorSeeds) + STAR_COLOR_CUTOFF;
      float grn = min(redBlu.x, redBlu.y) * seed;
      vec3 base = vec3(redBlu.x, grn, redBlu.y);
      
      // Optimized HSV conversion
      float hue = atan(grn - redBlu.x, redBlu.y - redBlu.x) * INV_PI * 0.5 + 0.5;
      hue = fract(hue + uHueShift * hueShiftNorm);
      float sat = length(base - vec3(dot(base, lumCoeff))) * uSaturation;
      float val = max(redBlu.x, max(grn, redBlu.y));
      base = hsv2rgb(vec3(hue, sat, val));
      
      // Optimize padding calculation
      vec2 pad = vec2(
        tris(seed * 34.0 + timeSpeedDiv10), 
        tris(seed * 38.0 + timeSpeedDiv30)
      ) - 0.5;
      
      float star = Star(gv - offset - pad, flareSize, 0.05 * uGlowIntensity);
      
      // Early skip if star contribution is negligible
      if (star < 0.001) continue;
      
      float twinkle = trisn(twinkleTime + seed * 6.2831) * 0.5 + 1.0;
      twinkle = mix(1.0, twinkle, uTwinkleIntensity);
      
      col += star * size * base * twinkle;
    }
    
    return col;
  }

  void main() {
    vec2 focalPx = uFocal * uResolution.xy;
    vec2 uv = (vUv * uResolution.xy - focalPx) / uResolution.y;
    
    // Optimize center repulsion
    if (uAutoCenterRepulsion > 0.0) {
      float centerDist = length(uv);
      if (centerDist > 0.1) { // Avoid division by very small numbers
        vec2 repulsion = uv * (uAutoCenterRepulsion / (centerDist * (centerDist + 0.1)));
        uv += repulsion * 0.05;
      }
    }
    
    // Combine rotations into single matrix multiplication
    float autoRotAngle = uTime * uRotationSpeed;
    float cosAuto = cos(autoRotAngle);
    float sinAuto = sin(autoRotAngle);
    
    // Combined rotation matrix
    mat2 combinedRot = mat2(
      cosAuto * uRotation.x + sinAuto * uRotation.y,
      -cosAuto * uRotation.y + sinAuto * uRotation.x,
      cosAuto * uRotation.y + sinAuto * uRotation.x,
      -cosAuto * uRotation.x + sinAuto * uRotation.y
    );
    
    uv = combinedRot * uv;
    
    vec3 col = vec3(0.0);
    
    // Optimize layer loop - use explicit loop bounds for GLSL ES 3.00
    const int maxLayers = int(NUM_LAYER);
    float layerStep = 1.0 / NUM_LAYER;
    float speedMult = uStarSpeed * uSpeed;
    
    for (int layerIndex = 0; layerIndex < maxLayers; layerIndex++) {
      float i = float(layerIndex) * layerStep;
      float depth = fract(i + speedMult);
      float scale = mix(20.0, 0.5, depth) * uDensity;
      float fade = depth * smoothstep(1.0, 0.9, depth);
      
      // Skip layers with minimal contribution
      if (fade < 0.01) continue;
      
      col += StarLayer(uv * scale + i * 453.32) * fade;
    }
    
    // Optimized alpha calculation
    float alpha = length(col);
    alpha = smoothstep(0.0, 0.3, alpha);
    fragColor = vec4(col, min(alpha, 1.0));
  }
`;

const renderer = new Renderer({
  alpha: true,
  premultipliedAlpha: false
});
const gl = renderer.gl;
gl.canvas.style.position = `absolute`;
gl.canvas.style.inset = `0`;
gl.canvas.style.width = `100%`;
gl.canvas.style.height = `100%`;
gl.canvas.style.mixBlendMode = `plus-lighter`;
gl.canvas.getContext(`webgl`, { antialias: false });
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(0, 0, 0, 0);
const container = document.querySelector<HTMLDivElement>(`#shaders`)!;
container.appendChild(gl.canvas);

const starSpeed = 2.5;
const program = new Program(gl, {
  vertex: vertexShader,
  fragment: fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uResolution: {
      value: new Color(
        gl.canvas.width,
        gl.canvas.height,
        gl.canvas.width / gl.canvas.height
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
    uAutoCenterRepulsion: { value: 0 }
  }
});
const mesh = new Mesh(gl, {
  geometry: new Triangle(gl),
  program
});

const resize = (): void => {
  renderer.setSize(container.offsetWidth || 1, container.offsetHeight || 1);
  program.uniforms.uResolution.value = new Color(
    gl.canvas.width,
    gl.canvas.height,
    gl.canvas.width / gl.canvas.height
  );
};
window.addEventListener(`resize`, resize, false);
resize();

const update = (t: number): void => {
  requestAnimationFrame(update);
  program.uniforms.uTime.value = t * 0.001;
  program.uniforms.uStarSpeed.value = (t * 0.001 * starSpeed) / 10.0;
  renderer.render({ scene: mesh });
};
requestAnimationFrame(update);
