import { Renderer, Program, Mesh, Triangle, Texture } from "ogl";

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

    out vec4 fragColor;

    uniform vec2  uResolution;
    uniform float uTime;
    uniform float uIntensity;
    uniform float uSpeed;
    uniform int   uColorCount;
    uniform float uDistort;
    uniform vec2  uOffset;
    uniform sampler2D uGradient;
    uniform float uNoiseAmount;
    uniform int   uRayCount;

    // Precomputed constants
    const mat2 ROT30 = mat2(0.8, -0.5, 0.5, 0.8);
    const float INV_255 = 1.0 / 255.0;
    const vec2 HASH_CONST = vec2(0.065, 0.005);
    const float HASH_MULT = 52.9829189;

    // Optimized rotation matrices using precomputed sin/cos where possible
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

    // Optimized bend angle with fewer sin calls
    float bendAngle(vec3 q, float t){
        vec3 phase = vec3(q.x * 0.55 + t * 0.6, q.y * 0.50 - t * 0.5, q.z * 0.60 + t * 0.7);
        vec3 s = sin(phase);
        return dot(s, vec3(0.8, 0.7, 0.6));
    }

    // Optimized hash function
    float hash21(vec2 p){
        p = floor(p);
        return fract(HASH_MULT * fract(dot(p, HASH_CONST)));
    }

    // Reduced noise octaves for better performance
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
        // Simplified smoothstep calculation
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

    void main(){
        vec2 frag = gl_FragCoord.xy;
        float t = uTime * uSpeed;
        
        // Precompute common values
        vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
        float marchT = 0.0;
        vec3 col = vec3(0.0);
        
        // Precompute rotation matrix once
        vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
        mat3 rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
        
        // Precompute constants
        float amp = clamp(uDistort, 0.0, 50.0) * 0.15;
        float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
        float n = layeredNoise(frag);
        float rayCountF = float(uRayCount);
        bool useRayCount = uRayCount > 0;
        bool useUserColors = uColorCount > 0;
        
        // Reduced loop iterations for better performance
        for (int i = 0; i < 32; ++i) {
            vec3 P = marchT * dir;
            P.z -= 2.0;
            float rad = length(P);
            
            // Early exit for distant rays
            if (rad > 8.0) break;
            
            vec3 Pl = P * (10.0 / max(rad, 1e-6));
            Pl = rot3dMat * Pl;

            float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;
            float grow = smoothstep(0.35, 3.0, marchT);
            
            // Optimized bending with fewer calculations
            float a1 = amp * grow * bendAngle(Pl * 0.6, t);
            float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + 3.1, t * 0.9);
            
            vec3 Pb = Pl;
            Pb.xz = rot2(Pb.xz, a1);
            Pb.xy = rot2(Pb.xy, a2);

            // Simplified ray pattern calculation
            float rayPattern = smoothstep(0.5, 0.7,
                sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
                sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
            );

            // Conditional ray count processing
            if (useRayCount) {
                float ang = atan(Pb.y, Pb.x);
                float comb = 0.5 + 0.5 * cos(rayCountF * ang);
                rayPattern *= smoothstep(0.15, 0.95, comb * comb * comb);
            }

            // Optimized color calculation
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

        col *= edgeFade(frag, uResolution, uOffset);
        col *= uIntensity;

        fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
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

const renderer = new Renderer({
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  alpha: true,
  antialias: false,
  premultipliedAlpha: true
});

const gl = renderer.gl;
gl.canvas.style.position = `absolute`;
gl.canvas.style.inset = `0`;
gl.canvas.style.width = `100%`;
gl.canvas.style.height = `100%`;
gl.canvas.style.mixBlendMode = `plus-lighter`;
const container = document.querySelector<HTMLDivElement>(`#shaders`)!;
container.appendChild(gl.canvas);

const gradientTex = new Texture(gl, {
  image: data,
  width: count,
  height: 1,
  generateMipmaps: false,
  flipY: false,
  minFilter: gl.LINEAR,
  magFilter: gl.LINEAR,
  wrapS: gl.CLAMP_TO_EDGE,
  wrapT: gl.CLAMP_TO_EDGE,
  format: gl.RGBA,
  type: gl.UNSIGNED_BYTE
});
gradientTex.needsUpdate = true;

const program = new Program(gl, {
  vertex: vertexShader,
  fragment: fragmentShader,
  uniforms: {
    uResolution: { value: [1, 1] as [number, number] },
    uTime: { value: 0 },
    uIntensity: { value: 2.4 },
    uSpeed: { value: 0.15 },
    uColorCount: { value: count },
    uDistort: { value: 8.2 },
    uOffset: { value: [0, 0] as [number, number] },
    uGradient: { value: gradientTex },
    uNoiseAmount: { value: 0.8 },
    uRayCount: { value: 32 }
  }
});

const mesh = new Mesh(gl, {
  geometry: new Triangle(gl),
  program
});

const resize = (): void => {
  renderer.setSize(container.clientWidth || 1, container.clientHeight || 1);
  program.uniforms.uResolution.value = [
    gl.drawingBufferWidth,
    gl.drawingBufferHeight
  ];
};

if (`ResizeObserver` in window) {
  const ro = new ResizeObserver(resize);
  ro.observe(container);
} else {
  (window as Window).addEventListener(`resize`, resize);
}
resize();

const update = (t: number): void => {
  renderer.render({ scene: mesh });
  program.uniforms.uTime.value = t * 0.001;
  requestAnimationFrame(update);
};
requestAnimationFrame(update);
