"use client";

import { useMemo } from "react";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Mesh } from "three";
import { projects, type Project } from "@/lib/projects";
import ProjectObject from "./ProjectObject";

/**
 * Cuarto en miniatura: paredes, piso, escritorio y decoración vienen de un
 * único .glb estático. El piso queda en y = 0.
 */
const ROOM_MODEL = "/models/room.glb";

type RoomProps = {
  onSelectProject: (project: Project) => void;
  onHoverProject?: (project: Project | null) => void;
};

export default function Room({ onSelectProject, onHoverProject }: RoomProps) {
  const { scene } = useGLTF(ROOM_MODEL);

  const room = useMemo(() => {
    scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return scene;
  }, [scene]);

  return (
    <group>
      {/* Entorno generado en el momento (sin HDR externo): le da algo que
          reflejar a los metales (notebook, lámpara, robot) y un brillo suave
          al plástico y la cerámica. */}
      <Environment resolution={128} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={1.4} color="#fff1dc" position={[0, 8, 0]} scale={[14, 14, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#ffe0bd" position={[9, 4, 7]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={0.5} color="#c9dcff" position={[-8, 3, -6]} scale={[6, 4, 1]} />
      </Environment>

      {/* Luz cálida general + rebote del piso */}
      <hemisphereLight args={["#fff3e0", "#c98a5a", 0.8]} />
      <ambientLight intensity={0.4} color="#ffe9cf" />

      {/* Key light suave: es la que arma las sombras del diorama */}
      <directionalLight
        position={[6.5, 9, 5]}
        intensity={2.3}
        color="#fff1d8"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      {/* Rim light fría para despegar los objetos de las paredes */}
      <directionalLight
        position={[-7, 4.5, -6]}
        intensity={0.6}
        color="#bcd4ff"
      />

      <primitive object={room} />

      {/* Sombra de contacto: el truco que más ayuda al look "miniatura".
          Va apenas por encima de la alfombra para que no la tape. */}
      <ContactShadows
        position={[0, 0.05, 0]}
        scale={9}
        resolution={1024}
        blur={2.4}
        far={3}
        opacity={0.4}
        color="#6d3f1e"
      />

      {projects.map((project) => (
        <ProjectObject
          key={project.id}
          project={project}
          onSelect={onSelectProject}
          onHoverChange={onHoverProject}
        />
      ))}
    </group>
  );
}

useGLTF.preload(ROOM_MODEL);
