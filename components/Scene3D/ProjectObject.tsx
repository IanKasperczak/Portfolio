"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MathUtils, type Group, type MeshStandardMaterial } from "three";
import type { Project } from "@/lib/projects";

const HOVER_SCALE = 1.08;
const HOVER_LIFT = 0.18;
const HOVER_EMISSIVE = 0.65;
const IDLE_EMISSIVE = 0.04;
/** Qué tan rápido convergen scale / lift / emissive al valor objetivo. */
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
  const material = useRef<MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);

  const [width, height, depth] = project.size;

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

    if (material.current) {
      material.current.emissiveIntensity = MathUtils.damp(
        material.current.emissiveIntensity,
        hovered ? HOVER_EMISSIVE : IDLE_EMISSIVE,
        DAMP,
        delta,
      );
    }
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

  // El material se comparte entre las variantes de forma.
  const surface = (
    <meshStandardMaterial
      ref={material}
      color={project.color}
      emissive={project.accent}
      emissiveIntensity={IDLE_EMISSIVE}
      roughness={0.48}
      metalness={0.04}
    />
  );

  return (
    <group
      ref={group}
      position={project.position}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
      onClick={handleClick}
    >
      {project.shape === "box" ? (
        <RoundedBox
          args={[width, height, depth]}
          radius={Math.min(width, height, depth) * 0.12}
          smoothness={4}
          position={[0, height / 2, 0]}
          castShadow
          receiveShadow
        >
          {surface}
        </RoundedBox>
      ) : (
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          {project.shape === "cylinder" ? (
            <cylinderGeometry args={[width / 2, width / 2, height, 40]} />
          ) : (
            <coneGeometry args={[width / 2, height, 44]} />
          )}
          {surface}
        </mesh>
      )}
    </group>
  );
}
