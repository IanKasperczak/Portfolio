"use client";

import { Suspense, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera, PerformanceMonitor } from "@react-three/drei";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";
import type { Project } from "@/lib/projects";
import Backdrop, { BACKGROUND_LAYER } from "./Backdrop";
import { ROOM_PIVOT, usePointerTracking, viewLayout } from "./interaction";
import PostProcessing from "./PostProcessing";
import Room from "./Room";

/**
 * Vista isométrica fija: cámara ortográfica mirando al centro del cuarto desde
 * una esquina. No hay OrbitControls a propósito — la idea es un diorama que se
 * mira, no una escena que se orbita. El movimiento lo pone TiltRig.
 */
const ISO_CAMERA_OFFSET: [number, number, number] = [12, 11, 12];
const ISO_CAMERA_POSITION: [number, number, number] = [
  ROOM_PIVOT.x + ISO_CAMERA_OFFSET[0],
  ROOM_PIVOT.y + ISO_CAMERA_OFFSET[1],
  ROOM_PIVOT.z + ISO_CAMERA_OFFSET[2],
];

/** Cuántas unidades de mundo ocupa el cuarto: tienen que entrar en su zona de pantalla. */
const FRAME_WIDTH = 13.6;
const FRAME_HEIGHT = 11.2;
const MIN_ZOOM = 18;

/**
 * Dónde va el cuarto dentro del canvas, que ocupa toda la pantalla.
 * Centro en UV (Y hacia arriba) y tamaño de la zona, en fracción del canvas.
 *
 * Desktop: el texto a la izquierda, el cuarto a la derecha.
 * Mobile/tablet vertical: el texto arriba, el cuarto abajo.
 *
 * Si se cambian, revisar la posición del label en components/sections/Hero.tsx
 * (está alineado con estos centros).
 */
const LAYOUTS = {
  // Borde izquierdo del cuarto en 0.67 - 0.56/2 = 0.39 del ancho; el texto
  // termina en 0.35 (ver Hero.tsx). Si se tocan, mantener ese margen.
  wide: { cx: 0.67, cy: 0.5, width: 0.56, height: 0.84 },
  narrow: { cx: 0.5, cy: 0.31, width: 0.98, height: 0.54 },
};

/**
 * Mismo corte que la variante `wide:` de globals.css, que acomoda el texto.
 * Se consulta la media query en vez de medir el canvas: el canvas no incluye
 * la barra de scroll y la media query sí, así que cerca del corte medirlo
 * daba "mobile" mientras el CSS ya estaba en "desktop", y texto y cuarto se pisaban.
 */
const WIDE_QUERY = "(min-width: 1024px) and (min-aspect-ratio: 23/20)";

function IsoCamera() {
  const camera = useRef<ThreeOrthographicCamera>(null);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useLayoutEffect(() => {
    const cam = camera.current;
    if (!cam) return;

    const layout = window.matchMedia(WIDE_QUERY).matches ? LAYOUTS.wide : LAYOUTS.narrow;
    viewLayout.cx = layout.cx;
    viewLayout.cy = layout.cy;

    cam.position.set(...ISO_CAMERA_POSITION);
    cam.lookAt(ROOM_PIVOT);
    cam.zoom = Math.max(
      MIN_ZOOM,
      Math.min((width * layout.width) / FRAME_WIDTH, (height * layout.height) / FRAME_HEIGHT),
    );
    // Corre la imagen sin mover la cámara: el centro del cuarto cae en (cx, cy).
    // Raycasting y la máscara del blur usan esta misma proyección, así que siguen alineados.
    const shiftX = (layout.cx - 0.5) * width;
    const shiftY = (0.5 - layout.cy) * height;
    cam.setViewOffset(width, height, -shiftX, -shiftY, width, height);
    cam.layers.enable(BACKGROUND_LAYER);
    cam.updateProjectionMatrix();
  }, [width, height]);

  return (
    <OrthographicCamera
      ref={camera}
      makeDefault
      position={ISO_CAMERA_POSITION}
      near={0.1}
      far={80}
      zoom={70}
    />
  );
}

function PointerTracker() {
  const canvas = useThree((state) => state.gl.domElement);
  usePointerTracking(canvas);
  return null;
}

type SceneProps = {
  onSelectProject: (project: Project) => void;
  onHoverProject?: (project: Project | null) => void;
  /** Con false el canvas deja de renderizar (por ejemplo, cuando no está en pantalla). */
  active?: boolean;
  /** Permite apagar el post-processing (fallback de performance a futuro). */
  postProcessing?: boolean;
};

export default function Scene({
  onSelectProject,
  onHoverProject,
  active = true,
  postProcessing = true,
}: SceneProps) {
  // La escena es dueña del "qué está resaltado": el post-processing lo usa para
  // mover el foco. El callback hacia afuera es sólo para la UI (el label).
  const [focusProject, setFocusProject] = useState<Project | null>(null);
  // Resolución nativa de la pantalla (hasta 2x). Si el equipo no da, se baja
  // un escalón, pero nunca por debajo de la nativa * 0.75: a 1x en una pantalla
  // de 1.25x o 1.5x el navegador estira la imagen y todo se ve pixelado.
  const [quality, setQuality] = useState(1);
  const native = typeof window === "undefined" ? 1 : Math.min(window.devicePixelRatio, 2);
  const dpr = Math.max(1, native * quality);

  const handleHover = useCallback(
    (project: Project | null) => {
      setFocusProject(project);
      onHoverProject?.(project);
    },
    [onHoverProject],
  );

  return (
    <Canvas
      // three 0.186 quitó PCFSoftShadowMap (el default de R3F): usamos PCF.
      shadows="percentage"
      orthographic
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true }}
      // Sin controles de órbita: dejamos que el scroll vertical del mobile
      // pase de largo en vez de quedar capturado por el canvas.
      style={{ touchAction: "pan-y" }}
    >
      <PerformanceMonitor onDecline={() => setQuality(0.75)} onIncline={() => setQuality(1)} />
      <PointerTracker />
      <IsoCamera />

      <Backdrop />
      {/* El fog lleva el color del borde del fondo: lo más lejano se funde con él. */}
      <fog attach="fog" args={["#e6cfb1", 30, 50]} />

      <Suspense fallback={null}>
        <Room onSelectProject={onSelectProject} onHoverProject={handleHover} />
      </Suspense>

      <PostProcessing enabled={postProcessing} focusProject={focusProject} />
    </Canvas>
  );
}
