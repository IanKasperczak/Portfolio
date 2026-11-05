"use client";

import { useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Box3, Group, Mesh, Vector3, type Object3D } from "three";
import { projects, type Project } from "@/lib/projects";
import { motionPrefs, Wobbler, type WobbleSettings } from "./interaction";
import ProjectObject from "./ProjectObject";
import TiltRig from "./TiltRig";

/**
 * Cuarto en miniatura: paredes, piso, escritorio y decoración vienen de un
 * único .glb estático. El piso queda en y = 0.
 */
const ROOM_MODEL = "/models/room.glb";

/**
 * Decoración que se tambalea. El cuarto viene exportado como un solo objeto,
 * pero three.js separa una malla por material, así que cada pieza se aísla por
 * el nombre de sus materiales (los de Blender). Si se renombran ahí, hay que
 * actualizarlos acá.
 */
const DECOR: { name: string; materials: string[]; settings: WobbleSettings }[] = [
  // Hojas sueltas sobre la maceta: oscilación lenta y larga.
  { name: "plant", materials: ["Leaf", "Leaf_Dark"], settings: { stiffness: 55, damping: 2.4, response: 0.07 } },
  { name: "lamp", materials: ["Lamp_Metal", "Lamp_Brass", "Lamp_Bulb"], settings: { stiffness: 120, damping: 4, response: 0.05 } },
  // Pesada y baja: apenas un temblor.
  { name: "mug", materials: ["Mug_Ceramic", "Coffee"], settings: { stiffness: 260, damping: 9, response: 0.03 } },
];

/**
 * Mete cada pieza de decoración en un pivote ubicado en su base, para poder
 * rotarla desde ahí. Modifica la escena del .glb (que useGLTF cachea), así que
 * guarda el resultado en ella y es idempotente.
 */
function createDecorWobblers(scene: Object3D): Wobbler[] {
  const cached = scene.userData.decorWobblers as Wobbler[] | undefined;
  if (cached) return cached;

  scene.updateMatrixWorld(true);
  const wobblers: Wobbler[] = [];

  for (const piece of DECOR) {
    const meshes: Mesh[] = [];
    scene.traverse((child) => {
      if (child instanceof Mesh && !Array.isArray(child.material) && piece.materials.includes(child.material.name)) {
        meshes.push(child);
      }
    });

    const parent = meshes[0]?.parent;
    if (!parent) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[Room] No se encontraron los materiales de "${piece.name}" en ${ROOM_MODEL}.`);
      }
      continue;
    }

    const box = new Box3();
    for (const mesh of meshes) box.expandByObject(mesh);
    const center = box.getCenter(new Vector3());
    const base = new Vector3(center.x, box.min.y, center.z);

    const pivot = new Group();
    pivot.name = `wobble:${piece.name}`;
    pivot.position.copy(base);
    parent.add(pivot);
    pivot.updateMatrixWorld(true);
    // attach() conserva la posición en el mundo: la pieza queda donde estaba.
    for (const mesh of meshes) pivot.attach(mesh);

    wobblers.push(new Wobbler(pivot, base, piece.settings));
  }

  scene.userData.decorWobblers = wobblers;
  return wobblers;
}

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

  const [decor] = useState(() => createDecorWobblers(scene));

  useFrame((_, delta) => {
    for (const wobbler of decor) {
      if (motionPrefs.reduced) wobbler.reset();
      else wobbler.update(delta);
    }
  });

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

      {/* Las luces quedan fuera del TiltRig: el cuarto se inclina bajo ellas. */}
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
      <directionalLight position={[-7, 4.5, -6]} intensity={0.6} color="#bcd4ff" />

      <TiltRig>
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
      </TiltRig>
    </group>
  );
}

useGLTF.preload(ROOM_MODEL);
