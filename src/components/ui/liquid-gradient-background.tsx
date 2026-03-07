"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type GradientScheme = 1 | 2 | 3 | 4 | 5;

const CROSSFADE_DURATION = 3.0; // seconds
const ALL_SCHEMES: GradientScheme[] = [1, 2, 3, 4, 5];

// Smooth easing for crossfade (cubic in-out)
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface SchemeConfig {
  colors: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];
  darkNavy: THREE.Vector3;
  speed: number;
  gradientSize: number;
  gradientCount: number;
  color1Weight: number;
  color2Weight: number;
  bgColor: number;
}

function getSchemeConfig(scheme: GradientScheme): SchemeConfig {
  switch (scheme) {
    case 1:
      return {
        colors: [
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.039, 0.055, 0.153),
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.039, 0.055, 0.153),
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.039, 0.055, 0.153),
        ],
        darkNavy: new THREE.Vector3(0.039, 0.055, 0.153),
        speed: 0.45, gradientSize: 0.45, gradientCount: 12,
        color1Weight: 0.5, color2Weight: 1.8, bgColor: 0x0a0e27,
      };
    case 2:
      return {
        colors: [
          new THREE.Vector3(1.0, 0.424, 0.314),
          new THREE.Vector3(0.251, 0.878, 0.816),
          new THREE.Vector3(1.0, 0.424, 0.314),
          new THREE.Vector3(0.251, 0.878, 0.816),
          new THREE.Vector3(1.0, 0.424, 0.314),
          new THREE.Vector3(0.251, 0.878, 0.816),
        ],
        darkNavy: new THREE.Vector3(0.039, 0.055, 0.153),
        speed: 0.35, gradientSize: 1.0, gradientCount: 6,
        color1Weight: 1.0, color2Weight: 1.0, bgColor: 0x0a0e27,
      };
    case 3:
      return {
        colors: [
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.039, 0.055, 0.153),
          new THREE.Vector3(0.251, 0.878, 0.816),
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.039, 0.055, 0.153),
          new THREE.Vector3(0.251, 0.878, 0.816),
        ],
        darkNavy: new THREE.Vector3(0.039, 0.055, 0.153),
        speed: 0.45, gradientSize: 0.45, gradientCount: 12,
        color1Weight: 0.5, color2Weight: 1.8, bgColor: 0x0a0e27,
      };
    case 4:
      return {
        colors: [
          new THREE.Vector3(0.949, 0.4, 0.2),
          new THREE.Vector3(0.176, 0.42, 0.427),
          new THREE.Vector3(0.82, 0.686, 0.612),
          new THREE.Vector3(0.949, 0.4, 0.2),
          new THREE.Vector3(0.176, 0.42, 0.427),
          new THREE.Vector3(0.82, 0.686, 0.612),
        ],
        darkNavy: new THREE.Vector3(0, 0, 0),
        speed: 0.35, gradientSize: 1.0, gradientCount: 6,
        color1Weight: 1.0, color2Weight: 1.0, bgColor: 0xffffff,
      };
    case 5:
      return {
        colors: [
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.0, 0.259, 0.22),
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.0, 0.0, 0.0),
          new THREE.Vector3(0.945, 0.353, 0.133),
          new THREE.Vector3(0.0, 0.0, 0.0),
        ],
        darkNavy: new THREE.Vector3(0.039, 0.055, 0.153),
        speed: 0.45, gradientSize: 0.45, gradientCount: 12,
        color1Weight: 0.5, color2Weight: 1.8, bgColor: 0x0a0e27,
      };
  }
}

type TypedUniforms = {
  uTime: { value: number };
  uResolution: { value: THREE.Vector2 };
  uColor1: { value: THREE.Vector3 }; uColor1B: { value: THREE.Vector3 };
  uColor2: { value: THREE.Vector3 }; uColor2B: { value: THREE.Vector3 };
  uColor3: { value: THREE.Vector3 }; uColor3B: { value: THREE.Vector3 };
  uColor4: { value: THREE.Vector3 }; uColor4B: { value: THREE.Vector3 };
  uColor5: { value: THREE.Vector3 }; uColor5B: { value: THREE.Vector3 };
  uColor6: { value: THREE.Vector3 }; uColor6B: { value: THREE.Vector3 };
  uDarkNavy: { value: THREE.Vector3 }; uDarkNavyB: { value: THREE.Vector3 };
  uCrossfade: { value: number };
  uSpeed: { value: number };
  uIntensity: { value: number };
  uTouchTexture: { value: THREE.Texture };
  uGrainIntensity: { value: number };
  uGradientSize: { value: number };
  uGradientCount: { value: number };
  uColor1Weight: { value: number };
  uColor2Weight: { value: number };
};

function writeColorsToUniforms(
  config: SchemeConfig,
  uniforms: TypedUniforms,
  target: "A" | "B"
) {
  if (target === "A") {
    uniforms.uColor1.value.copy(config.colors[0]);
    uniforms.uColor2.value.copy(config.colors[1]);
    uniforms.uColor3.value.copy(config.colors[2]);
    uniforms.uColor4.value.copy(config.colors[3]);
    uniforms.uColor5.value.copy(config.colors[4]);
    uniforms.uColor6.value.copy(config.colors[5]);
    uniforms.uDarkNavy.value.copy(config.darkNavy);
  } else {
    uniforms.uColor1B.value.copy(config.colors[0]);
    uniforms.uColor2B.value.copy(config.colors[1]);
    uniforms.uColor3B.value.copy(config.colors[2]);
    uniforms.uColor4B.value.copy(config.colors[3]);
    uniforms.uColor5B.value.copy(config.colors[4]);
    uniforms.uColor6B.value.copy(config.colors[5]);
    uniforms.uDarkNavyB.value.copy(config.darkNavy);
  }
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
    vUv = uv;
  }
`;

const FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec2 uResolution;

  // Scheme A (current)
  uniform vec3 uColor1; uniform vec3 uColor2; uniform vec3 uColor3;
  uniform vec3 uColor4; uniform vec3 uColor5; uniform vec3 uColor6;
  uniform vec3 uDarkNavy;

  // Scheme B (target for crossfade)
  uniform vec3 uColor1B; uniform vec3 uColor2B; uniform vec3 uColor3B;
  uniform vec3 uColor4B; uniform vec3 uColor5B; uniform vec3 uColor6B;
  uniform vec3 uDarkNavyB;

  // Crossfade progress 0 → 1
  uniform float uCrossfade;

  uniform float uSpeed;
  uniform float uIntensity;
  uniform sampler2D uTouchTexture;
  uniform float uGrainIntensity;
  uniform float uGradientSize;
  uniform float uGradientCount;
  uniform float uColor1Weight;
  uniform float uColor2Weight;

  varying vec2 vUv;

  float grain(vec2 uv, float time) {
    vec2 g = uv * uResolution * 0.5;
    return fract(sin(dot(g + time, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
  }

  vec3 getGradientColor(vec2 uv, float time,
    vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5, vec3 c6, vec3 navy) {

    float r = uGradientSize;

    vec2 p1  = vec2(0.5 + sin(time*uSpeed*0.40)*0.40, 0.5 + cos(time*uSpeed*0.50)*0.40);
    vec2 p2  = vec2(0.5 + cos(time*uSpeed*0.60)*0.50, 0.5 + sin(time*uSpeed*0.45)*0.50);
    vec2 p3  = vec2(0.5 + sin(time*uSpeed*0.35)*0.45, 0.5 + cos(time*uSpeed*0.55)*0.45);
    vec2 p4  = vec2(0.5 + cos(time*uSpeed*0.50)*0.40, 0.5 + sin(time*uSpeed*0.40)*0.40);
    vec2 p5  = vec2(0.5 + sin(time*uSpeed*0.70)*0.35, 0.5 + cos(time*uSpeed*0.60)*0.35);
    vec2 p6  = vec2(0.5 + cos(time*uSpeed*0.45)*0.50, 0.5 + sin(time*uSpeed*0.65)*0.50);
    vec2 p7  = vec2(0.5 + sin(time*uSpeed*0.55)*0.38, 0.5 + cos(time*uSpeed*0.48)*0.42);
    vec2 p8  = vec2(0.5 + cos(time*uSpeed*0.65)*0.36, 0.5 + sin(time*uSpeed*0.52)*0.44);
    vec2 p9  = vec2(0.5 + sin(time*uSpeed*0.42)*0.41, 0.5 + cos(time*uSpeed*0.58)*0.39);
    vec2 p10 = vec2(0.5 + cos(time*uSpeed*0.48)*0.37, 0.5 + sin(time*uSpeed*0.62)*0.43);
    vec2 p11 = vec2(0.5 + sin(time*uSpeed*0.68)*0.33, 0.5 + cos(time*uSpeed*0.44)*0.46);
    vec2 p12 = vec2(0.5 + cos(time*uSpeed*0.38)*0.39, 0.5 + sin(time*uSpeed*0.56)*0.41);

    float i1  = 1.0 - smoothstep(0.0, r, length(uv - p1));
    float i2  = 1.0 - smoothstep(0.0, r, length(uv - p2));
    float i3  = 1.0 - smoothstep(0.0, r, length(uv - p3));
    float i4  = 1.0 - smoothstep(0.0, r, length(uv - p4));
    float i5  = 1.0 - smoothstep(0.0, r, length(uv - p5));
    float i6  = 1.0 - smoothstep(0.0, r, length(uv - p6));
    float i7  = 1.0 - smoothstep(0.0, r, length(uv - p7));
    float i8  = 1.0 - smoothstep(0.0, r, length(uv - p8));
    float i9  = 1.0 - smoothstep(0.0, r, length(uv - p9));
    float i10 = 1.0 - smoothstep(0.0, r, length(uv - p10));
    float i11 = 1.0 - smoothstep(0.0, r, length(uv - p11));
    float i12 = 1.0 - smoothstep(0.0, r, length(uv - p12));

    vec2 rv1 = uv - 0.5;
    float a1 = time * uSpeed * 0.15;
    rv1 = vec2(rv1.x*cos(a1) - rv1.y*sin(a1), rv1.x*sin(a1) + rv1.y*cos(a1)) + 0.5;

    vec2 rv2 = uv - 0.5;
    float a2 = -time * uSpeed * 0.12;
    rv2 = vec2(rv2.x*cos(a2) - rv2.y*sin(a2), rv2.x*sin(a2) + rv2.y*cos(a2)) + 0.5;

    float ri1 = 1.0 - smoothstep(0.0, 0.8, length(rv1 - 0.5));
    float ri2 = 1.0 - smoothstep(0.0, 0.8, length(rv2 - 0.5));

    vec3 col = vec3(0.0);
    col += c1 * i1  * (0.55 + 0.45 * sin(time*uSpeed))       * uColor1Weight;
    col += c2 * i2  * (0.55 + 0.45 * cos(time*uSpeed*1.20))  * uColor2Weight;
    col += c3 * i3  * (0.55 + 0.45 * sin(time*uSpeed*0.80))  * uColor1Weight;
    col += c4 * i4  * (0.55 + 0.45 * cos(time*uSpeed*1.30))  * uColor2Weight;
    col += c5 * i5  * (0.55 + 0.45 * sin(time*uSpeed*1.10))  * uColor1Weight;
    col += c6 * i6  * (0.55 + 0.45 * cos(time*uSpeed*0.90))  * uColor2Weight;

    if (uGradientCount > 6.0) {
      col += c1 * i7  * (0.55 + 0.45 * sin(time*uSpeed*1.40)) * uColor1Weight;
      col += c2 * i8  * (0.55 + 0.45 * cos(time*uSpeed*1.50)) * uColor2Weight;
      col += c3 * i9  * (0.55 + 0.45 * sin(time*uSpeed*1.60)) * uColor1Weight;
      col += c4 * i10 * (0.55 + 0.45 * cos(time*uSpeed*1.70)) * uColor2Weight;
    }
    if (uGradientCount > 10.0) {
      col += c5 * i11 * (0.55 + 0.45 * sin(time*uSpeed*1.80)) * uColor1Weight;
      col += c6 * i12 * (0.55 + 0.45 * cos(time*uSpeed*1.90)) * uColor2Weight;
    }

    col += mix(c1, c3, ri1) * 0.45 * uColor1Weight;
    col += mix(c2, c4, ri2) * 0.40 * uColor2Weight;

    col = clamp(col, vec3(0.0), vec3(1.0)) * uIntensity;

    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.35);
    col = pow(col, vec3(0.92));

    float b = length(col);
    col = mix(navy, col, max(b * 1.2, 0.15));
    b = length(col);
    if (b > 1.0) col *= (1.0 / b);

    return col;
  }

  void main() {
    vec2 uv = vUv;

    vec4 touch = texture2D(uTouchTexture, uv);
    float tx = -(touch.r * 2.0 - 1.0);
    float ty = -(touch.g * 2.0 - 1.0);
    float ti = touch.b;
    uv.x += tx * 0.8 * ti;
    uv.y += ty * 0.8 * ti;

    float dist = length(uv - 0.5);
    uv += vec2(
      sin(dist * 20.0 - uTime * 3.0) * 0.04 * ti +
      sin(dist * 15.0 - uTime * 2.0) * 0.03 * ti
    );

    // Interpolate all 6 colors and navy between scheme A and B
    vec3 c1 = mix(uColor1, uColor1B, uCrossfade);
    vec3 c2 = mix(uColor2, uColor2B, uCrossfade);
    vec3 c3 = mix(uColor3, uColor3B, uCrossfade);
    vec3 c4 = mix(uColor4, uColor4B, uCrossfade);
    vec3 c5 = mix(uColor5, uColor5B, uCrossfade);
    vec3 c6 = mix(uColor6, uColor6B, uCrossfade);
    vec3 navy = mix(uDarkNavy, uDarkNavyB, uCrossfade);

    vec3 color = getGradientColor(uv, uTime, c1, c2, c3, c4, c5, c6, navy);

    color += grain(uv, uTime) * uGrainIntensity;

    float ts = uTime * 0.5;
    color.r += sin(ts) * 0.02;
    color.g += cos(ts * 1.4) * 0.02;
    color.b += sin(ts * 1.2) * 0.02;

    float b2 = length(color);
    color = mix(navy, color, max(b2 * 1.2, 0.15));
    color = clamp(color, vec3(0.0), vec3(1.0));
    b2 = length(color);
    if (b2 > 1.0) color *= (1.0 / b2);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface LiquidGradientBackgroundProps {
  scheme?: GradientScheme;
  analyserRef?: React.RefObject<AnalyserNode | null>;
  /** When true, automatically cycles through all 5 schemes on each song change */
  cycleOnSongChange?: boolean;
  /** Pass the current song ID — a change triggers a scheme crossfade */
  songId?: string;
}

export function LiquidGradientBackground({
  scheme = 1,
  analyserRef,
  cycleOnSongChange = false,
  songId,
}: LiquidGradientBackgroundProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  // Signal from outside the Three.js loop to trigger a cycle
  const triggerCycleRef = useRef(false);
  const prevSongIdRef = useRef(songId);

  // Detect song changes and arm the trigger
  useEffect(() => {
    if (!cycleOnSongChange) return;
    if (prevSongIdRef.current !== undefined && prevSongIdRef.current !== songId) {
      triggerCycleRef.current = true;
    }
    prevSongIdRef.current = songId;
  }, [songId, cycleOnSongChange]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    camera.position.z = 50;
    const scene = new THREE.Scene();

    // Touch texture
    const touchSize = 64;
    const touchMaxAge = 64;
    const touchRadius = 0.25 * touchSize;
    const touchCanvas = document.createElement("canvas");
    touchCanvas.width = touchSize;
    touchCanvas.height = touchSize;
    const touchCtx = touchCanvas.getContext("2d")!;
    touchCtx.fillStyle = "black";
    touchCtx.fillRect(0, 0, touchSize, touchSize);
    const touchTexture = new THREE.Texture(touchCanvas);
    const trail: { x: number; y: number; age: number; force: number; vx: number; vy: number }[] = [];
    let lastTouch: { x: number; y: number } | null = null;

    const updateTouchTexture = () => {
      touchCtx.fillStyle = "black";
      touchCtx.fillRect(0, 0, touchSize, touchSize);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        const f = p.force * (1 / touchMaxAge) * (1 - p.age / touchMaxAge);
        p.x += p.vx * f;
        p.y += p.vy * f;
        p.age++;
        if (p.age > touchMaxAge) { trail.splice(i, 1); continue; }
        const pos = { x: p.x * touchSize, y: (1 - p.y) * touchSize };
        let intensity = p.age < touchMaxAge * 0.3
          ? Math.sin((p.age / (touchMaxAge * 0.3)) * (Math.PI / 2))
          : (() => { const t = 1 - (p.age - touchMaxAge * 0.3) / (touchMaxAge * 0.7); return -t * (t - 2); })();
        intensity *= p.force;
        const c = `${((p.vx + 1) / 2) * 255},${((p.vy + 1) / 2) * 255},${intensity * 255}`;
        const off = touchSize * 5;
        touchCtx.shadowOffsetX = off;
        touchCtx.shadowOffsetY = off;
        touchCtx.shadowBlur = touchRadius;
        touchCtx.shadowColor = `rgba(${c},${0.2 * intensity})`;
        touchCtx.beginPath();
        touchCtx.fillStyle = "rgba(255,0,0,1)";
        touchCtx.arc(pos.x - off, pos.y - off, touchRadius, 0, Math.PI * 2);
        touchCtx.fill();
      }
      touchTexture.needsUpdate = true;
    };

    const addTouch = (pt: { x: number; y: number }) => {
      let force = 0, vx = 0, vy = 0;
      if (lastTouch) {
        const dx = pt.x - lastTouch.x, dy = pt.y - lastTouch.y;
        if (dx === 0 && dy === 0) return;
        const d = Math.sqrt(dx * dx + dy * dy);
        vx = dx / d; vy = dy / d;
        force = Math.min((dx * dx + dy * dy) * 20000, 2.0);
      }
      lastTouch = { x: pt.x, y: pt.y };
      trail.push({ x: pt.x, y: pt.y, age: 0, force, vx, vy });
    };

    const getViewSize = () => {
      const h = Math.abs(camera.position.z * Math.tan((camera.fov * Math.PI) / 180 / 2) * 2);
      return { width: h * camera.aspect, height: h };
    };

    const initialConfig = getSchemeConfig(scheme);
    scene.background = new THREE.Color(initialConfig.bgColor);

    const uniforms: TypedUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uColor1: { value: new THREE.Vector3() }, uColor1B: { value: new THREE.Vector3() },
      uColor2: { value: new THREE.Vector3() }, uColor2B: { value: new THREE.Vector3() },
      uColor3: { value: new THREE.Vector3() }, uColor3B: { value: new THREE.Vector3() },
      uColor4: { value: new THREE.Vector3() }, uColor4B: { value: new THREE.Vector3() },
      uColor5: { value: new THREE.Vector3() }, uColor5B: { value: new THREE.Vector3() },
      uColor6: { value: new THREE.Vector3() }, uColor6B: { value: new THREE.Vector3() },
      uDarkNavy: { value: new THREE.Vector3() }, uDarkNavyB: { value: new THREE.Vector3() },
      uCrossfade: { value: 0 },
      uSpeed: { value: initialConfig.speed },
      uIntensity: { value: 1.8 },
      uTouchTexture: { value: touchTexture },
      uGrainIntensity: { value: 0.08 },
      uGradientSize: { value: initialConfig.gradientSize },
      uGradientCount: { value: initialConfig.gradientCount },
      uColor1Weight: { value: initialConfig.color1Weight },
      uColor2Weight: { value: initialConfig.color2Weight },
    };

    // Write initial scheme to A; B starts identical so there's no initial flash
    writeColorsToUniforms(initialConfig, uniforms, "A");
    writeColorsToUniforms(initialConfig, uniforms, "B");

    const vs = getViewSize();
    const geometry = new THREE.PlaneGeometry(vs.width, vs.height, 1, 1);
    const material = new THREE.ShaderMaterial({ uniforms: uniforms as unknown as Record<string, { value: unknown }>, vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mutable state tracked inside the animation loop
    let currentSchemeIndex = ALL_SCHEMES.indexOf(scheme);
    let crossfadeProgress = 0;
    let isCrossfading = false;

    // Refs for audio-reactive base values (updated when scheme changes)
    let baseSpeed = initialConfig.speed;
    let baseIntensity = 1.8;
    let baseGradientSize = initialConfig.gradientSize;

    const startCrossfade = () => {
      if (isCrossfading) return;
      currentSchemeIndex = (currentSchemeIndex + 1) % ALL_SCHEMES.length;
      const nextConfig = getSchemeConfig(ALL_SCHEMES[currentSchemeIndex]);
      writeColorsToUniforms(nextConfig, uniforms, "B");
      // Snap non-color settings immediately
      uniforms.uSpeed.value = nextConfig.speed;
      uniforms.uGradientSize.value = nextConfig.gradientSize;
      uniforms.uGradientCount.value = nextConfig.gradientCount;
      uniforms.uColor1Weight.value = nextConfig.color1Weight;
      uniforms.uColor2Weight.value = nextConfig.color2Weight;
      baseSpeed = nextConfig.speed;
      baseGradientSize = nextConfig.gradientSize;
      crossfadeProgress = 0;
      isCrossfading = true;
    };

    const completeCrossfade = () => {
      // Snap A colors to B so next crossfade starts from the new scheme
      uniforms.uColor1.value.copy(uniforms.uColor1B.value);
      uniforms.uColor2.value.copy(uniforms.uColor2B.value);
      uniforms.uColor3.value.copy(uniforms.uColor3B.value);
      uniforms.uColor4.value.copy(uniforms.uColor4B.value);
      uniforms.uColor5.value.copy(uniforms.uColor5B.value);
      uniforms.uColor6.value.copy(uniforms.uColor6B.value);
      uniforms.uDarkNavy.value.copy(uniforms.uDarkNavyB.value);
      uniforms.uCrossfade.value = 0;
      scene.background = new THREE.Color(getSchemeConfig(ALL_SCHEMES[currentSchemeIndex]).bgColor);
      isCrossfading = false;
    };

    const freqData = new Uint8Array(128);
    const clock = new THREE.Clock();
    let animFrameId: number;

    const tick = () => {
      const delta = Math.min(clock.getDelta(), 0.1);
      uniforms.uTime.value += delta;

      // Check for external cycle trigger
      if (triggerCycleRef.current) {
        triggerCycleRef.current = false;
        startCrossfade();
      }

      // Advance crossfade
      if (isCrossfading) {
        crossfadeProgress = Math.min(1, crossfadeProgress + delta / CROSSFADE_DURATION);
        uniforms.uCrossfade.value = easeInOutCubic(crossfadeProgress);
        if (crossfadeProgress >= 1) completeCrossfade();
      }

      // Audio-reactive modulation
      const analyser = analyserRef?.current;
      if (analyser) {
        analyser.getByteFrequencyData(freqData);

        // Bass: bins 0-7 (~0–170 Hz)
        let bassSum = 0;
        for (let i = 0; i < 8; i++) bassSum += freqData[i];
        const bass = bassSum / (8 * 255);

        // Mids: bins 8-47 (~170 Hz – 1 kHz)
        let midSum = 0;
        for (let i = 8; i < 48; i++) midSum += freqData[i];
        const mid = midSum / (40 * 255);

        // Highs: bins 48-95 (~1–2 kHz) — adds grain texture
        let highSum = 0;
        for (let i = 48; i < 96; i++) highSum += freqData[i];
        const high = highSum / (48 * 255);

        // Overall amplitude
        let ampSum = 0;
        for (let i = 0; i < freqData.length; i++) ampSum += freqData[i];
        const amplitude = ampSum / (freqData.length * 255);

        // Dramatic speed surge on bass hits
        uniforms.uSpeed.value = baseSpeed + bass * 2.5;
        // Brightness swell with overall loudness
        uniforms.uIntensity.value = baseIntensity + amplitude * 1.5;
        // Blobs expand/contract with mids
        uniforms.uGradientSize.value = baseGradientSize + mid * 0.6;
        // Grain texture intensifies on high frequencies
        uniforms.uGrainIntensity.value = 0.08 + high * 0.18;
        // Primary color punches harder on beat
        uniforms.uColor1Weight.value = getSchemeConfig(ALL_SCHEMES[currentSchemeIndex]).color1Weight + bass * 1.2;
      }

      updateTouchTexture();
      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(tick);
    };

    tick();

    const onMouseMove = (ev: MouseEvent) => addTouch({ x: ev.clientX / window.innerWidth, y: 1 - ev.clientY / window.innerHeight });
    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      addTouch({ x: t.clientX / window.innerWidth, y: 1 - t.clientY / window.innerHeight });
    };
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      const s = getViewSize();
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(s.width, s.height, 1, 1);
      uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      touchTexture.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [scheme, analyserRef]);

  return (
    <div
      ref={mountRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
