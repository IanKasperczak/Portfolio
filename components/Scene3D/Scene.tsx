"use client";

import { Suspense, useCallback, useLayoutEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import type { OrthographicCamera as ThreeOrthographicCamera } from "three";
import type { Project } from "@/lib/projects";
import Desk from "./Desk";
import PostProcessing from "./PostProcessing";

/**
 * Vista isométrica fija: cámara ortográfica mirando al origen desde una
 * esquina. No hay OrbitControls a propósito — la idea es un diorama que se
 * mira, no una escena que se orbita.
 */
const ISO_CAMERA_POSITION: [number, number, number] = [12, 11, 12];

/** Cuántas unidades de mundo tienen que entrar en el viewport, sí o sí. */
const FRAME_WIDTH = 18;
const FRAME_HEIGHT = 11;
const MIN_ZOOM = 18;

const BACKGROUND = "#f3e3cd";

/**
 * Cámara fija apuntando al centro. El zoom se recalcula con el tamaño real del
 * canvas, así la escena entra completa tanto en desktop como en mobile.
 */
function IsoCamera() {
  const camera = useRef<ThreeOrthographicCamera>(null);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  useLayoutEffect(() => {
    const cam = camera.current;
    if (!cam) return;

    cam.position.set(...ISO_CAMERA_POSITION);
    cam.lookAt(0, 0, 0);
    cam.zoom = Math.max(
      MIN_ZOOM,
      Math.min(width / FRAME_WIDTH, height / FRAME_HEIGHT),
    );
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

type SceneProps = {
  onSelectProject: (project: Project) => void;
  onHoverProject?: (project: Project | null) => void;
  /** Permite apagar el post-processing (fallback de performance a futuro). */
  postProcessing?: boolean;
};

export default function Scene({
  onSelectProject,
  onHoverProject,
  postProcessing = true,
}: SceneProps) {
  // La escena es dueña del "qué está resaltado": el post-processing lo usa para
  // mover el foco. El callback hacia afuera es sólo para la UI (el label).
  const [focusProject, setFocusProject] = useState<Project | null>(null);

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
      dpr={[1, 2]}
      gl={{ antialias: true }}
      // Sin controles de órbita: dejamos que el scroll vertical del mobile
      // pase de largo en vez de quedar capturado por el canvas.
      style={{ touchAction: "pan-y" }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 24, 42]} />

      <IsoCamera />

      <Suspense fallback={null}>
        <Desk onSelectProject={onSelectProject} onHoverProject={handleHover} />
      </Suspense>

      <PostProcessing enabled={postProcessing} focusProject={focusProject} />
    </Canvas>
  );
}
