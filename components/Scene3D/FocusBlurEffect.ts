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
uniform sampler2D maskBlurBuffer;
uniform float focusStrength;
uniform float edgeStrength;
uniform float aspect;
uniform vec2 center;
uniform vec3 glowColor;
uniform float glowStrength;

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
  // Sale de la máscara desenfocada: un degradé continuo, sin los escalones que
  // daba muestrear la silueta en un anillo de puntos.
  if (glowStrength > 0.001) {
    float soft = texture2D(maskBlurBuffer, uv).r;
    float halo = smoothstep(0.03, 0.32, soft) * 0.55 + soft * 0.75;
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
  private readonly maskBlurPass: KawaseBlurPass;
  private readonly maskBlurTarget: WebGLRenderTarget;
  private readonly maskMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    toneMapped: false,
  });
  private readonly clearColor = new Color();
  private readonly swapped = new Map<Mesh, Material | Material[]>();
  /** La máscara desenfocada todavía tiene la silueta del último objeto. */
  private maskBlurDirty = false;

  constructor({ edgeStrength = 0.4 } = {}) {
    super("FocusBlurEffect", fragmentShader, {
      uniforms: new Map<string, Uniform>([
        ["blurBuffer", new Uniform(null)],
        ["maskBuffer", new Uniform(null)],
        ["maskBlurBuffer", new Uniform(null)],
        ["focusStrength", new Uniform(0)],
        ["edgeStrength", new Uniform(edgeStrength)],
        ["aspect", new Uniform(1)],
        ["center", new Uniform(new Vector2(0.5, 0.5))],
        ["glowColor", new Uniform(new Color())],
        ["glowStrength", new Uniform(0)],
      ]),
    });

    this.blurPass = new KawaseBlurPass({
      kernelSize: KernelSize.LARGE,
      resolutionScale: 0.5,
    });
    this.blurTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });
    // Resolución completa y con MSAA: es el borde entre lo nítido y lo
    // borroso, y a media resolución se veía escalonado al agrandarse el objeto.
    this.maskTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false, samples: 4 });

    this.maskBlurPass = new KawaseBlurPass({
      kernelSize: KernelSize.MEDIUM,
      resolutionScale: 0.5,
    });
    this.maskBlurTarget = new WebGLRenderTarget(1, 1, { depthBuffer: false });

    this.uniforms.get("blurBuffer")!.value = this.blurTarget.texture;
    this.uniforms.get("maskBuffer")!.value = this.maskTarget.texture;
    this.uniforms.get("maskBlurBuffer")!.value = this.maskBlurTarget.texture;
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
    this.maskBlurPass.initialize(renderer, alpha, frameBufferType);
    // El blur trabaja sobre el buffer lineal del composer: mismo formato.
    this.blurTarget.texture.type = frameBufferType as TextureDataType;
  }

  override setSize(width: number, height: number) {
    this.blurPass.setSize(width, height);
    this.blurTarget.setSize(width, height);
    this.maskTarget.setSize(width, height);
    // El halo es un degradé: a media resolución no se nota y cuesta un cuarto.
    this.maskBlurPass.setSize(width, height);
    this.maskBlurTarget.setSize(Math.max(1, Math.floor(width / 2)), Math.max(1, Math.floor(height / 2)));
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
    const active = Boolean(target && this.camera && (this.focusStrength > 0.001 || this.glowStrength > 0.001));
    if (target && this.camera && active) {
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

    // Sin objeto resaltado la máscara está vacía: no hace falta desenfocarla.
    if (active || this.maskBlurDirty) {
      this.maskBlurPass.render(renderer, this.maskTarget, this.maskBlurTarget);
      this.maskBlurDirty = active;
    }

    renderer.setClearColor(this.clearColor, previousAlpha);
    renderer.setRenderTarget(previousTarget);
  }

  override dispose() {
    super.dispose();
    this.blurPass.dispose();
    this.blurTarget.dispose();
    this.maskTarget.dispose();
    this.maskBlurPass.dispose();
    this.maskBlurTarget.dispose();
    this.maskMaterial.dispose();
  }
}
