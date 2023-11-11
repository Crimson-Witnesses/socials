import { extend, type ReactThreeFiber } from "@react-three/fiber";
import { shaderMaterial } from "@react-three/drei";
import type { ShaderMaterial } from "three";
import { Color, Vector2 } from "three";

const perlin = /*glsl*/ `
#define GLSLIFY 1
#define MAX_FBM_ITERATIONS 30
#define gln_PI 3.1415926538

vec4 gln_rand4(vec4 p) {
  return mod(((p * 34.0) + 1.0) * p, 289.0);
}

vec2 _fade(vec2 t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float gln_perlin(vec2 P) {
  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
  Pi = mod(Pi, 289.0); // To avoid truncation effects in permutation
  vec4 ix = Pi.xzxz;
  vec4 iy = Pi.yyww;
  vec4 fx = Pf.xzxz;
  vec4 fy = Pf.yyww;
  vec4 i = gln_rand4(gln_rand4(ix) + iy);
  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
  vec4 gy = abs(gx) - 0.5;
  vec4 tx = floor(gx + 0.5);
  gx = gx - tx;
  vec2 g00 = vec2(gx.x, gy.x);
  vec2 g10 = vec2(gx.y, gy.y);
  vec2 g01 = vec2(gx.z, gy.z);
  vec2 g11 = vec2(gx.w, gy.w);
  vec4 norm =
      1.79284291400159 - 0.85373472095314 * vec4(dot(g00, g00), dot(g01, g01),
                                                 dot(g10, g10), dot(g11, g11));
  g00 *= norm.x;
  g01 *= norm.y;
  g10 *= norm.z;
  g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x, fy.x));
  float n10 = dot(g10, vec2(fx.y, fy.y));
  float n01 = dot(g01, vec2(fx.z, fy.z));
  float n11 = dot(g11, vec2(fx.w, fy.w));
  vec2 fade_xy = _fade(Pf.xy);
  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
  
  return 2.3 * n_xy;
}
`;

const vertexShader = /*glsl*/ `
${perlin}

uniform float time;
uniform float foldFrequency;
uniform float foldHeight;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec2 waveDirection;

varying vec4 v_modelPosition;
varying float v_elevation;
varying float v_foldElevation;

void main() {
  v_modelPosition = modelMatrix * vec4(position, 1.0);

  v_elevation = gln_perlin((v_modelPosition.xz * waveFrequency) + (waveDirection * time)) * waveAmplitude + 0.5; 
  v_foldElevation = mod(v_modelPosition.z, foldFrequency) * foldHeight;

  v_modelPosition.y += -v_modelPosition.z;
  v_modelPosition.y += v_foldElevation;
  v_modelPosition.y += v_elevation - 0.5;

  vec4 viewPosition = viewMatrix * v_modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;
}
`;

const fragmentShader = /*glsl*/ `
${perlin}

uniform float time;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 backgroundColor;
uniform float colorSmoothing;

varying vec4 v_modelPosition;
varying float v_elevation;
varying float v_foldElevation;

void main() {
  float color_perlin = gln_perlin(v_modelPosition.xz * colorSmoothing + 5.0 + time/2.0)+0.5;
  vec3 blend1 = step(-0.5, -color_perlin) * mix(color1, color2, smoothstep(0.0, 0.5, color_perlin));
  vec3 blend2 = step(0.5, color_perlin) * mix(color2, color3, smoothstep(0.5, 1.0, color_perlin));
  vec3 color = mix(blend1 + blend2, backgroundColor, -v_modelPosition.z + 0.5);

  gl_FragColor = vec4(mix(backgroundColor, color, v_elevation + 0.5), 1.0);
}
`;

export const WavesMaterial = shaderMaterial(
  {
    color1: new Color(`#ff8f00`),
    color2: new Color(`#f5c000`),
    color3: new Color(`#7c0009`),
    backgroundColor: new Color(`#000000`),
    colorSmoothing: 0.5,
    foldFrequency: 0.05,
    foldHeight: 4.0,
    waveFrequency: 1.2,
    waveAmplitude: 0.83,
    waveDirection: new Vector2(-0.1, 1),
    time: 0
  },
  vertexShader,
  fragmentShader
);

extend({ WavesMaterial });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      wavesMaterial: ReactThreeFiber.Object3DNode<
        ShaderMaterial,
        typeof WavesMaterial
      >;
    }
  }
}
