import {
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoBlending,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type IUniform,
  type MagnificationTextureFilter,
  type WebGLRenderer,
} from "three";

/**
 * Simulación de fluidos 2D (stable fluids, Jos Stam) en la GPU, con el
 * esquema de pasadas de WebGL-Fluid-Simulation de Pavel Dobryakov:
 * curl → vorticidad → divergencia → presión (Jacobi) → gradiente → advección.
 *
 * La "tinta" no es luz sino pigmento: cada canal guarda cuánto absorbe, y al
 * mostrarla se multiplica el fondo por exp(-absorción). Sobre un fondo crema
 * eso se ve como tinta en leche, y dos colores que se cruzan se mezclan como
 * pintura en vez de lavarse hacia el blanco.
 */

export type FluidConfig = {
  /** Resolución de la grilla de velocidad (el lado corto). */
  simResolution: number;
  /** Resolución de la tinta (el lado corto). Define qué tan nítidos son los bordes. */
  dyeResolution: number;
  pressureIterations: number;
  /** Fuerza de los remolinos. */
  curl: number;
  /** Más bajo = el movimiento dura más. */
  velocityDissipation: number;
  /** Más bajo = la tinta tarda más en desvanecerse. */
  densityDissipation: number;
  pressure: number;
  /** Radio del chorro, en % del canvas. */
  splatRadius: number;
};

type DoubleTarget = { read: WebGLRenderTarget; write: WebGLRenderTarget; swap(): void };

const SIM_VERTEX = /* glsl */ `
uniform vec2 texelSize;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  vUv = uv;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SPLAT = /* glsl */ `
uniform sampler2D uTarget;
uniform float aspectRatio;
uniform vec3 color;
uniform vec2 point;
uniform float radius;
varying vec2 vUv;

void main() {
  vec2 p = vUv - point;
  p.x *= aspectRatio;
  vec3 splat = exp(-dot(p, p) / radius) * color;
  gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + splat, 1.0);
}
`;

const ADVECTION = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 velocityTexel;
uniform float dt;
uniform float dissipation;
varying vec2 vUv;

void main() {
  vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * velocityTexel;
  gl_FragColor = texture2D(uSource, coord) / (1.0 + dissipation * dt);
}
`;

const CURL = /* glsl */ `
uniform sampler2D uVelocity;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}
`;

const VORTICITY = /* glsl */ `
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float curl;
uniform float dt;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;
  force *= curl * C;
  force.y *= -1.0;

  vec2 velocity = texture2D(uVelocity, vUv).xy + force * dt;
  gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`;

const DIVERGENCE = /* glsl */ `
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;

  // Bordes sólidos: el fluido rebota en vez de escaparse del canvas.
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }

  gl_FragColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}
`;

const SCALE = /* glsl */ `
uniform sampler2D uTexture;
uniform float value;
varying vec2 vUv;

void main() {
  gl_FragColor = value * texture2D(uTexture, vUv);
}
`;

const PRESSURE = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`;

const GRADIENT_SUBTRACT = /* glsl */ `
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;

void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

/** Se dibuja en clip-space detrás de todo: ignora la cámara y cubre el canvas. */
const DISPLAY_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const DISPLAY_FRAGMENT = /* glsl */ `
uniform sampler2D uDye;
uniform vec2 uTexel;
uniform vec3 uBaseCenter;
uniform vec3 uBaseEdge;
uniform vec2 uCenter;
uniform float uAspect;
uniform float uStrength;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 absorption = texture2D(uDye, vUv).rgb;

  // Relieve: la densidad de tinta como altura, para que se lea como líquido.
  float l = length(texture2D(uDye, vUv - vec2(uTexel.x, 0.0)).rgb);
  float r = length(texture2D(uDye, vUv + vec2(uTexel.x, 0.0)).rgb);
  float t = length(texture2D(uDye, vUv + vec2(0.0, uTexel.y)).rgb);
  float b = length(texture2D(uDye, vUv - vec2(0.0, uTexel.y)).rgb);
  vec3 normal = normalize(vec3(l - r, b - t, 0.08));
  vec3 light = normalize(vec3(-0.4, 0.6, 1.0));

  // Fondo: más claro detrás del cuarto, como un halo.
  float dist = length((vUv - uCenter) * vec2(uAspect, 1.0));
  vec3 base = mix(uBaseCenter, uBaseEdge, smoothstep(0.1, 1.15, dist));

  float ink = clamp(length(absorption) * 1.5, 0.0, 1.0);
  vec3 color = base * exp(-absorption * uStrength);
  color *= mix(1.0, 0.9 + 0.14 * dot(normal, light), ink);
  float sheen = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  color += sheen * 0.08 * ink;

  // Dithering: sin esto el degradé del fondo muestra bandas.
  color += (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
  gl_FragColor = vec4(color, 1.0);
}
`;

function createTarget(width: number, height: number, filter: MagnificationTextureFilter) {
  return new WebGLRenderTarget(width, height, {
    type: HalfFloatType,
    format: RGBAFormat,
    minFilter: filter,
    magFilter: filter,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function createDoubleTarget(width: number, height: number, filter: MagnificationTextureFilter): DoubleTarget {
  return {
    read: createTarget(width, height, filter),
    write: createTarget(width, height, filter),
    swap() {
      const read = this.read;
      this.read = this.write;
      this.write = read;
    },
  };
}

/** Resolución con `base` en el lado corto, respetando la proporción del canvas. */
function resolution(base: number, aspect: number): [number, number] {
  const long = Math.round(base * (aspect < 1 ? 1 / aspect : aspect));
  return aspect >= 1 ? [long, base] : [base, long];
}

function simMaterial(fragmentShader: string, uniforms: Record<string, IUniform>) {
  return new ShaderMaterial({
    vertexShader: SIM_VERTEX,
    fragmentShader,
    uniforms: { texelSize: { value: new Vector2() }, ...uniforms },
    depthTest: false,
    depthWrite: false,
    blending: NoBlending,
  });
}

export class FluidSim {
  /** Material del fondo: va en un plano de la escena principal. */
  readonly displayMaterial: ShaderMaterial;

  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: Mesh;
  private readonly simTexel = new Vector2();
  private readonly dyeTexel = new Vector2();
  private readonly splatColor = new Vector3();
  private aspect = 1;

  private velocity!: DoubleTarget;
  private dye!: DoubleTarget;
  private pressure!: DoubleTarget;
  private divergence!: WebGLRenderTarget;
  private curl!: WebGLRenderTarget;

  private readonly splatPass = simMaterial(SPLAT, {
    uTarget: { value: null },
    aspectRatio: { value: 1 },
    color: { value: new Vector3() },
    point: { value: new Vector2() },
    radius: { value: 0.01 },
  });
  private readonly advectionPass = simMaterial(ADVECTION, {
    uVelocity: { value: null },
    uSource: { value: null },
    velocityTexel: { value: new Vector2() },
    dt: { value: 0 },
    dissipation: { value: 0 },
  });
  private readonly curlPass = simMaterial(CURL, { uVelocity: { value: null } });
  private readonly vorticityPass = simMaterial(VORTICITY, {
    uVelocity: { value: null },
    uCurl: { value: null },
    curl: { value: 0 },
    dt: { value: 0 },
  });
  private readonly divergencePass = simMaterial(DIVERGENCE, { uVelocity: { value: null } });
  private readonly scalePass = simMaterial(SCALE, { uTexture: { value: null }, value: { value: 0 } });
  private readonly pressurePass = simMaterial(PRESSURE, {
    uPressure: { value: null },
    uDivergence: { value: null },
  });
  private readonly gradientPass = simMaterial(GRADIENT_SUBTRACT, {
    uPressure: { value: null },
    uVelocity: { value: null },
  });

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly config: FluidConfig,
    colors: { center: string; edge: string; strength: number },
  ) {
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.splatPass);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);

    this.displayMaterial = new ShaderMaterial({
      vertexShader: DISPLAY_VERTEX,
      fragmentShader: DISPLAY_FRAGMENT,
      uniforms: {
        uDye: { value: null },
        uTexel: { value: new Vector2() },
        uBaseCenter: { value: new Color(colors.center) },
        uBaseEdge: { value: new Color(colors.edge) },
        uCenter: { value: new Vector2(0.5, 0.5) },
        uAspect: { value: 1 },
        uStrength: { value: colors.strength },
      },
      depthTest: false,
      depthWrite: false,
    });

    this.resize(1, 1);
  }

  /** Recrea los buffers para un canvas de `width` × `height` (px CSS). Se pierde la tinta. */
  resize(width: number, height: number) {
    this.disposeTargets();
    this.aspect = width / Math.max(1, height);

    const [simW, simH] = resolution(this.config.simResolution, this.aspect);
    const [dyeW, dyeH] = resolution(this.config.dyeResolution, this.aspect);
    this.simTexel.set(1 / simW, 1 / simH);
    this.dyeTexel.set(1 / dyeW, 1 / dyeH);

    this.velocity = createDoubleTarget(simW, simH, LinearFilter);
    this.dye = createDoubleTarget(dyeW, dyeH, LinearFilter);
    this.pressure = createDoubleTarget(simW, simH, NearestFilter);
    this.divergence = createTarget(simW, simH, NearestFilter);
    this.curl = createTarget(simW, simH, NearestFilter);

    const display = this.displayMaterial.uniforms;
    display.uDye.value = this.dye.read.texture;
    display.uTexel.value.copy(this.dyeTexel);
    display.uAspect.value = this.aspect;
  }

  /** Centro del halo del fondo, en UV. */
  setCenter(u: number, v: number) {
    this.displayMaterial.uniforms.uCenter.value.set(u, v);
  }

  /**
   * Chorro en (u, v) que empuja con fuerza (fx, fy) y deja una tinta que
   * absorbe `absorption` por canal.
   */
  splat(u: number, v: number, fx: number, fy: number, absorption: Color) {
    const previous = this.renderer.getRenderTarget();
    const uniforms = this.splatPass.uniforms;

    // Corrección de proporción: un mismo gesto empuja igual en ambos ejes.
    const dx = this.aspect < 1 ? fx * this.aspect : fx;
    const dy = this.aspect > 1 ? fy / this.aspect : fy;
    const radius = (this.config.splatRadius / 100) * (this.aspect > 1 ? this.aspect : 1);

    uniforms.aspectRatio.value = this.aspect;
    uniforms.point.value.set(u, v);
    uniforms.radius.value = radius;

    uniforms.texelSize.value.copy(this.simTexel);
    uniforms.uTarget.value = this.velocity.read.texture;
    uniforms.color.value.set(dx, dy, 0);
    this.blit(this.splatPass, this.velocity.write);
    this.velocity.swap();

    uniforms.texelSize.value.copy(this.dyeTexel);
    uniforms.uTarget.value = this.dye.read.texture;
    uniforms.color.value.copy(this.splatColor.set(absorption.r, absorption.g, absorption.b));
    this.blit(this.splatPass, this.dye.write);
    this.dye.swap();

    this.displayMaterial.uniforms.uDye.value = this.dye.read.texture;
    this.renderer.setRenderTarget(previous);
  }

  step(dt: number) {
    const previous = this.renderer.getRenderTarget();
    const { curl, pressure, pressureIterations, velocityDissipation, densityDissipation } = this.config;

    for (const pass of [this.curlPass, this.vorticityPass, this.divergencePass, this.scalePass, this.pressurePass, this.gradientPass, this.advectionPass]) {
      pass.uniforms.texelSize.value.copy(this.simTexel);
    }

    this.curlPass.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.curlPass, this.curl);

    const vorticity = this.vorticityPass.uniforms;
    vorticity.uVelocity.value = this.velocity.read.texture;
    vorticity.uCurl.value = this.curl.texture;
    vorticity.curl.value = curl;
    vorticity.dt.value = dt;
    this.blit(this.vorticityPass, this.velocity.write);
    this.velocity.swap();

    this.divergencePass.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.divergencePass, this.divergence);

    // La presión del paso anterior arranca atenuada: converge más rápido.
    this.scalePass.uniforms.uTexture.value = this.pressure.read.texture;
    this.scalePass.uniforms.value.value = pressure;
    this.blit(this.scalePass, this.pressure.write);
    this.pressure.swap();

    this.pressurePass.uniforms.uDivergence.value = this.divergence.texture;
    for (let i = 0; i < pressureIterations; i++) {
      this.pressurePass.uniforms.uPressure.value = this.pressure.read.texture;
      this.blit(this.pressurePass, this.pressure.write);
      this.pressure.swap();
    }

    this.gradientPass.uniforms.uPressure.value = this.pressure.read.texture;
    this.gradientPass.uniforms.uVelocity.value = this.velocity.read.texture;
    this.blit(this.gradientPass, this.velocity.write);
    this.velocity.swap();

    const advection = this.advectionPass.uniforms;
    advection.velocityTexel.value.copy(this.simTexel);
    advection.dt.value = dt;

    advection.uVelocity.value = this.velocity.read.texture;
    advection.uSource.value = this.velocity.read.texture;
    advection.dissipation.value = velocityDissipation;
    this.blit(this.advectionPass, this.velocity.write);
    this.velocity.swap();

    advection.uVelocity.value = this.velocity.read.texture;
    advection.uSource.value = this.dye.read.texture;
    advection.dissipation.value = densityDissipation;
    this.blit(this.advectionPass, this.dye.write);
    this.dye.swap();

    this.displayMaterial.uniforms.uDye.value = this.dye.read.texture;
    this.renderer.setRenderTarget(previous);
  }

  dispose() {
    this.disposeTargets();
    this.quad.geometry.dispose();
    for (const pass of [this.splatPass, this.advectionPass, this.curlPass, this.vorticityPass, this.divergencePass, this.scalePass, this.pressurePass, this.gradientPass]) {
      pass.dispose();
    }
    this.displayMaterial.dispose();
  }

  private blit(material: ShaderMaterial, target: WebGLRenderTarget) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.scene, this.camera);
  }

  private disposeTargets() {
    if (!this.velocity) return;
    for (const target of [
      this.velocity.read, this.velocity.write,
      this.dye.read, this.dye.write,
      this.pressure.read, this.pressure.write,
      this.divergence, this.curl,
    ]) {
      target.dispose();
    }
  }
}
