import { Effect, KawaseBlurPass, KernelSize } from "postprocessing";
import {
  Color,
  Mesh,
  MeshBasicMaterial,
  Uniform,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type TextureDataType,
  type WebGLRenderer,
} from "three";

/**
 * Blur selectivo para el diorama, en screen-space:
 *
 * - `edgeStrength`: blur muy suave que crece desde `center` (el cuarto en
 *   pantalla) hacia las esquinas: el look "miniatura" en reposo.
 * - `focusStrength`: blur de toda la escena salvo `focusObject`, que se
 *   recorta con una máscara (su silueta renderizada en blanco).
 * - `glowStrength`: halo de color `glowColor` por fuera de esa misma
 *   silueta, que marca el objeto resaltado sin tocar sus materiales.
 *
 * Reemplaza al DepthOfField de postprocessing: su CoC usa
 * `length(viewPosition)`, que con cámara ortográfica crece hacia los bordes
 * de la pantalla y termina desenfocando casi toda la escena.
 */
const fragmentShader = /* glsl */ `
uniform sampler2D blurBuffer;
uniform sampler2D maskBuffer;
uniform float focusStrength;
uniform float edgeStrength;
uniform float aspect;
uniform vec2 center;
uniform vec2 maskTexel;
uniform vec3 glowColor;
uniform float glowStrength;

const int GLOW_SAMPLES = 16;

// Cobertura de la silueta en un anillo de ese radio (en texels de la máscara).
float ring(const in vec2 uv, const in float radius) {
  float sum = 0.0;
  for (int i = 0; i < GLOW_SAMPLES; i++) {
    float angle = float(i) * 6.28318530718 / float(GLOW_SAMPLES);
    sum += texture2D(maskBuffer, uv + vec2(cos(angle), sin(angle)) * maskTexel * radius).r;
  }
  return sum / float(GLOW_SAMPLES);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // 0 en el centro del cuarto, 1 en las esquinas, respetando la proporción del canvas.
  vec2 fromCenter = (uv - center) * vec2(aspect, 1.0);
  float corner = length(vec2(aspect, 1.0) * 0.5);
  float edge = smoothstep(0.55, 1.0, length(fromCenter) / corner);

  float mask = texture2D(maskBuffer, uv).r;
  float amount = max(edgeStrength * edge, focusStrength) * (1.0 - mask);

  vec3 blurred = texture2D(blurBuffer, uv).rgb;
  vec3 color = mix(inputColor.rgb, blurred, clamp(amount, 0.0, 1.0));

  // Halo: línea firme pegada a la silueta + degradé suave hacia afuera.
  // Sólo por fuera del objeto, así sus materiales quedan intactos.
  if (glowStrength > 0.001) {
    float halo = min(1.0, ring(uv, 1.5) * 1.6) * 0.8 + ring(uv, 4.0) * 0.5;
    color += glowColor * clamp(halo, 0.0, 1.0) * (1.0 - mask) * glowStrength;
  }

  outputColor = vec4(color, inputColor.a);
}
`;

export class FocusBlurEffect extends Effect {
  /** Objeto que queda nítido cuando `focusStrength` > 0. */
  focusObject: Object3D | null = null;
  /** Cámara con la que se renderiza la máscara (la misma de la escena). */
  camera: Camera | null = null;

  private readonly blurPass: KawaseBlurPass;
  private readonly blurTarget: WebGLRenderTarget;
  private readonly maskTarget: WebGLRenderTarget;
  private readonly maskMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    toneMapped: false,
  });
  private readonly clearColor = new Color();
  private readonly swapped = new Map<Mesh, Material | Material[]>();

  constructor({ edgeStrength = 0.4 } = {}) {
    super("FocusBlurEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["blurBuffer", new Uniform(null)],
        ["maskBuffer", new Uniform(null)],
        ["focusStrength", new Uniform(0)],
        ["edgeStrength", new Uniform(edgeStrength)],
        ["aspect", new Uniform(1)],
        ["center", new Uniform(new Vector2(0.5, 0.5))],
        ["maskTexel", new Uniform(new Vector2(1, 1))],
        ["glowColor", new Uniform(new Color())],
        ["glowStrength", new Uniform(0)],
      ]),
    });

    this.blurPass = new KawaseBlurPass({
      kernelSize: KernelSize.LARGE,
      resolutionScale: 0.5,
    });
    this.blurTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.maskTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });
    this.uniforms.get("blurBuffer")!.value = this.blurTarget.texture;
    this.uniforms.get("maskBuffer")!.value = this.maskTarget.texture;
  }

  get focusStrength(): number {
    return this.uniforms.get("focusStrength")!.value;
  }

  set focusStrength(value: number) {
    this.uniforms.get("focusStrength")!.value = value;
  }

  /** Color del halo. Se modifica in-place (`glowColor.set(...)`). */
  get glowColor(): Color {
    return this.uniforms.get("glowColor")!.value;
  }

  get glowStrength(): number {
    return this.uniforms.get("glowStrength")!.value;
  }

  set glowStrength(value: number) {
    this.uniforms.get("glowStrength")!.value = value;
  }

  /** Centro del look miniatura, en UV de pantalla (Y hacia arriba). */
  setCenter(u: number, v: number) {
    this.uniforms.get("center")!.value.set(u, v);
  }

  get edgeStrength(): number {
    return this.uniforms.get("edgeStrength")!.value;
  }

  set edgeStrength(value: number) {
    this.uniforms.get("edgeStrength")!.value = value;
  }

  override initialize(renderer: WebGLRenderer, alpha: boolean, frameBufferType: number) {
    this.blurPass.initialize(renderer, alpha, frameBufferType);
    // El blur trabaja sobre el buffer lineal del composer: mismo formato.
    this.blurTarget.texture.type = frameBufferType as TextureDataType;
  }

  override setSize(width: number, height: number) {
    this.blurPass.setSize(width, height);
    this.blurTarget.setSize(width, height);
    // La máscara no necesita resolución completa: a la mitad queda con un
    // borde levemente suave, que disimula el corte entre nítido y borroso.
    const maskWidth = Math.max(1, Math.floor(width / 2));
    const maskHeight = Math.max(1, Math.floor(height / 2));
    this.maskTarget.setSize(maskWidth, maskHeight);
    this.uniforms.get("maskTexel")!.value.set(1 / maskWidth, 1 / maskHeight);
    this.uniforms.get("aspect")!.value = width / Math.max(1, height);
  }

  override update(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget) {
    this.blurPass.render(renderer, inputBuffer, this.blurTarget);

    const previousTarget = renderer.getRenderTarget();
    const previousAlpha = renderer.getClearAlpha();
    renderer.getClearColor(this.clearColor);

    renderer.setRenderTarget(this.maskTarget);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, false, false);

    const target = this.focusObject;
    if (target && this.camera && (this.focusStrength > 0.001 || this.glowStrength > 0.001)) {
      // Silueta del objeto en blanco: se cambian sus materiales sólo durante
      // este render y se restauran enseguida.
      target.traverse((child) => {
        if (child instanceof Mesh) {
          this.swapped.set(child, child.material);
          child.material = this.maskMaterial;
        }
      });
      renderer.render(target, this.camera);
      for (const [mesh, material] of this.swapped) mesh.material = material;
      this.swapped.clear();
    }

    renderer.setClearColor(this.clearColor, previousAlpha);
    renderer.setRenderTarget(previousTarget);
  }

  override dispose() {
    super.dispose();
    this.blurPass.dispose();
    this.blurTarget.dispose();
    this.maskTarget.dispose();
    this.maskMaterial.dispose();
  }
}
