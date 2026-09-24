"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils, Mesh, type Group } from "three";
import { projects, type Project } from "@/lib/projects";

const HOVER_SCALE = 1.08;
const HOVER_LIFT = 0.18;
/** Qué tan rápido convergen scale / lift al valor objetivo. El brillo del
 *  hover lo dibuja el post-processing alrededor de la silueta. */
const DAMP = 9;

type ProjectObjectProps = {
  project: Project;
  onSelect: (project: Project) => void;
  onHoverChange?: (project: Project | null) => void;
};

export default function ProjectObject({
  project,
  onSelect,
  onHoverChange,
}: ProjectObjectProps) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(project.model);

  const model = useMemo(() => {
    scene.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
    });
    return scene;
  }, [scene]);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    const scale = MathUtils.damp(
      node.scale.x,
      hovered ? HOVER_SCALE : 1,
      DAMP,
      delta,
    );
    node.scale.setScalar(scale);

    node.position.y = MathUtils.damp(
      node.position.y,
      project.position[1] + (hovered ? HOVER_LIFT : 0),
      DAMP,
      delta,
    );
  });

  const setHoverState = (value: boolean) => {
    setHovered(value);
    onHoverChange?.(value ? project : null);
  };

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHoverState(true);
  };

  const handleOut = () => setHoverState(false);

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(project);
  };

  return (
    <group
      ref={group}
      // El post-processing busca el objeto resaltado por este nombre.
      name={project.id}
      position={project.position}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      <primitive object={model} />
    </group>
  );
}

for (const project of projects) {
  useGLTF.preload(project.model);
}
