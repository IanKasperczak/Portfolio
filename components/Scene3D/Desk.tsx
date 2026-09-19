"use client";

import { ContactShadows, RoundedBox } from "@react-three/drei";
import { projects, type Project } from "@/lib/projects";
import ProjectObject from "./ProjectObject";

/** Escritorio + alfombrilla. La cara de apoyo (top de la alfombrilla) queda en y = 0. */
const DESK_SIZE: [number, number, number] = [15, 1, 10.5];
const MAT_SIZE: [number, number, number] = [11.5, 0.12, 7.4];

type DeskProps = {
  onSelectProject: (project: Project) => void;
  onHoverProject?: (project: Project | null) => void;
};

export default function Desk({ onSelectProject, onHoverProject }: DeskProps) {
  return (
    <group>
      {/* Luz cálida general + rebote del escritorio */}
      <hemisphereLight args={["#fff3e0", "#c98a5a", 0.6]} />
      <ambientLight intensity={0.35} color="#ffe9cf" />

      {/* Key light suave: es la que arma las sombras del diorama */}
      <directionalLight
        position={[6.5, 9, 5]}
        intensity={1.5}
        color="#fff1d8"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      {/* Rim light fría para despegar los objetos del fondo */}
      <directionalLight
        position={[-7, 4.5, -6]}
        intensity={0.4}
        color="#bcd4ff"
      />

      {/* Escritorio */}
      <RoundedBox
        args={DESK_SIZE}
        radius={0.2}
        smoothness={4}
        position={[0, -DESK_SIZE[1] / 2 - MAT_SIZE[1], 0]}
        receiveShadow
        castShadow
      >
        <meshStandardMaterial color="#c88a5b" roughness={0.75} metalness={0} />
      </RoundedBox>

      {/* Alfombrilla / mantel, para dar profundidad al plano */}
      <RoundedBox
        args={MAT_SIZE}
        radius={0.05}
        smoothness={3}
        position={[0, -MAT_SIZE[1] / 2, 0.4]}
        receiveShadow
      >
        <meshStandardMaterial color="#efdcc2" roughness={0.9} metalness={0} />
      </RoundedBox>

      {/* Sombra de contacto: el truco que más ayuda al look "miniatura" */}
      <ContactShadows
        position={[0, 0.012, 0.4]}
        scale={16}
        resolution={1024}
        blur={2.6}
        far={4}
        opacity={0.45}
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
