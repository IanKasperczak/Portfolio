"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { KawaseBlurPass, KernelSize } from "postprocessing";
import {
  Color,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Texture,
  type WebGLRenderer,
} from "three";
import { motionPrefs, pointer, shadowCaster, viewLayout } from "./interaction";

/**
 * Fondo detrás del cuarto: un papel crema, más claro detrás del cuarto, sobre
 * el que el cuarto proyecta una sombra larga. La luz sigue al mouse como si
 * fuera el sol, así que al moverlo la sombra gira hacia el lado contrario.
 *
 * Es deliberadamente tenue: no compite con el texto ni con el cuarto.
 */

/**
 * Capa de la cámara en la que vive el fondo. Va separada para que ninguna
 * cámara auxiliar lo vea: ContactShadows renderiza la escena desde abajo con un
 * material de profundidad propio, y vería este plano como una pared en el origen.
 */
export const BACKGROUND_LAYER = 1;

/** Sin mover el mouse este tiempo, la luz pasa a moverse sola. */
const IDLE_AFTER_MS = 3000;
/** Qué tan rápido la luz alcanza al mouse (1/s). Lento: se siente como el sol. */
const LIGHT_FOLLOW = 1.6;
/** La máscara del cuarto se dibuja a esta fracción del canvas: la sombra es difusa. */
const MASK_SCALE = 0.25;

const VERTEX = /* glsl */ `
varying vec2 vUv;

// Clip-space detrás de todo: ignora la cámara y cubre el canvas.
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uMask;
uniform vec3 uBaseCenter;
uniform vec3 uBaseEdge;
uniform vec3 uShadowTint;
uniform vec2 uCenter;
uniform float uAspect;
uniform vec2 uShadowReach;
uniform float uShadowStrength;
varying vec2 vUv;

const int SHADOW_SAMPLES = 32;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float dist = length((vUv - uCenter) * vec2(uAspect, 1.0));
  vec3 color = mix(uBaseCenter, uBaseEdge, smoothstep(0.1, 1.15, dist));

  // Sombra del cuarto: desde cada punto se mira hacia la luz; si en el camino
  // está el cuarto, el punto queda en sombra. Más lejos del cuarto, más tenue.
  // Pasos fijos (sin ruido por píxel, que granulaba el borde): la máscara
  // desenfocada es más ancha que un paso, así que no se ven escalones.
  float shadow = 0.0;
  for (int i = 0; i < SHADOW_SAMPLES; i++) {
    float t = (float(i) + 0.5) / float(SHADOW_SAMPLES);
    // La máscara viene desenfocada: el borde se reafirma un poco para que la
    // sombra tenga cuerpo pegada al cuarto y se disuelva recién a lo lejos.
    float occluder = smoothstep(0.0, 0.55, texture2D(uMask, vUv - uShadowReach * t).r);
    shadow = max(shadow, occluder * (1.0 - t * 0.85));
  }
  color = mix(color, color * uShadowTint, shadow * uShadowStrength);

  // Dithering: sin esto el degradé del fondo muestra bandas.
  color += (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Silueta blanca del cuarto vista desde la cámara, desenfocada. Es lo que
 * después se "estira" en dirección contraria a la luz para hacer la sombra.
 */
class RoomMask {
  private readonly target = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private readonly blurred = new WebGLRenderTarget(1, 1, { depthBuffer: false });
  private readonly blur = new KawaseBlurPass({ kernelSize: KernelSize.LARGE, resolutionScale: 1 });
  private readonly material = new MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  private readonly swapped = new Map<Mesh, Material | Material[]>();
  private readonly clearColor = new Color();

  get texture() {
    return this.blurred.texture;
  }

  setSize(width: number, height: number) {
    const w = Math.max(1, Math.round(width * MASK_SCALE));
    const h = Math.max(1, Math.round(height * MASK_SCALE));
    this.target.setSize(w, h);
    this.blurred.setSize(w, h);
    this.blur.setSize(w, h);
  }

  render(renderer: WebGLRenderer, camera: Camera) {
    const previousTarget = renderer.getRenderTarget();
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);

    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);

    const caster = shadowCaster.object;
    if (caster) {
      caster.traverse((child) => {
        if (child instanceof Mesh) {
          this.swapped.set(child, child.material);
          child.material = this.material;
        }
      });
      renderer.render(caster, camera);
      for (const [mesh, material] of this.swapped) mesh.material = material;
      this.swapped.clear();
    }

    this.blur.render(renderer, this.target, this.blurred);

    renderer.setClearColor(this.clearColor, previousAlpha);
    renderer.setRenderTarget(previousTarget);
  }

  dispose() {
    this.target.dispose();
    this.blurred.dispose();
    this.blur.dispose();
    this.material.dispose();
  }
}

class BackdropMaterial extends ShaderMaterial {
  constructor() {
    super({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uMask: { value: null },
        uBaseCenter: { value: new Color("#faf1e4") },
        uBaseEdge: { value: new Color("#e6cfb1") },
        // Sombra cálida, nunca gris: el fondo es papel crema.
        uShadowTint: { value: new Color("#b98a64") },
        uCenter: { value: new Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
        uShadowReach: { value: new Vector2() },
        uShadowStrength: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
  }

  get aspect(): number {
    return this.uniforms.uAspect.value;
  }

  setAspect(value: number) {
    this.uniforms.uAspect.value = value;
  }

  /** Centro del cuarto en pantalla (UV): ahí el fondo es más claro. */
  setCenter(u: number, v: number) {
    this.uniforms.uCenter.value.set(u, v);
  }

  /** Hasta dónde llega la sombra (vector en UV) y qué tan oscura es (0..1). */
  setShadow(reachU: number, reachV: number, strength: number) {
    this.uniforms.uShadowReach.value.set(reachU, reachV);
    this.uniforms.uShadowStrength.value = strength;
  }

  setMask(texture: Texture) {
    this.uniforms.uMask.value = texture;
  }
}

export default function Backdrop() {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  const [mask] = useState(() => new RoomMask());
  const [material] = useState(() => new BackdropMaterial());
  const light = useRef({ u: 0.2, v: 0.9, placed: false });

  useEffect(() => {
    mask.setSize(width, height);
    material.setAspect(width / Math.max(1, height));
  }, [mask, material, width, height]);

  useEffect(
    () => () => {
      mask.dispose();
      material.dispose();
    },
    [mask, material],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const idle = !pointer.fine || performance.now() - pointer.lastMove > IDLE_AFTER_MS;

    // Con el mouse, la luz lo sigue. Sin él, recorre despacio un arco por
    // arriba del cuarto, como el sol en el día.
    let targetU: number;
    let targetV: number;
    if (motionPrefs.reduced) {
      targetU = 0.18;
      targetV = 0.92;
    } else if (idle) {
      targetU = viewLayout.cx + 0.42 * Math.sin(time * 0.09);
      targetV = 0.86 + 0.08 * Math.cos(time * 0.09);
    } else {
      targetU = pointer.u;
      targetV = pointer.v;
    }
    const l = light.current;
    if (!l.placed || motionPrefs.reduced) {
      l.u = targetU;
      l.v = targetV;
      l.placed = true;
    } else {
      l.u = MathUtils.damp(l.u, targetU, LIGHT_FOLLOW, dt);
      l.v = MathUtils.damp(l.v, targetV, LIGHT_FOLLOW, dt);
    }

    // La sombra va del cuarto hacia el lado opuesto a la luz. Cuanto más
    // lejos está la luz, más rasante, y más larga la sombra.
    const aspect = material.aspect;
    const dx = (viewLayout.cx - l.u) * aspect;
    const dy = viewLayout.cy - l.v;
    const distance = Math.hypot(dx, dy);
    const reach = MathUtils.clamp(0.14 + distance * 0.45, 0.14, 0.5);
    // Con la luz justo encima del cuarto no hay dirección: la sombra se apaga.
    const strength = 0.8 * MathUtils.smoothstep(distance, 0.04, 0.3);
    const ux = distance > 1e-4 ? dx / distance : 0;
    const uy = distance > 1e-4 ? dy / distance : 0;
    material.setShadow((ux * reach) / aspect, uy * reach, strength);

    material.setCenter(viewLayout.cx, viewLayout.cy);
    mask.render(state.gl, state.camera);
    material.setMask(mask.texture);
  });

  return (
    <mesh layers={BACKGROUND_LAYER} renderOrder={-1000} frustumCulled={false} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
