"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MathUtils, Mesh, Vector3, type Group } from "three";
import { projects, type Project } from "@/lib/projects";
import { DEFAULT_WOBBLE, motionPrefs, Wobbler } from "./interaction";

const HOVER_SCALE = 1.08;
const HOVER_LIFT = 0.18;
/** Qué tan rápido convergen scale / lift al valor objetivo. El brillo del
 *  hover lo dibuja el post-processing alrededor de la silueta. */
const DAMP = 9;
/** Empujón (rad/s) al entrar el cursor: confirma que el objeto se puede tocar. */
const HOVER_KICK = 1.4;

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
  const wobbler = useRef<Wobbler | null>(null);
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

    // El origen del modelo está en su base: rotar el grupo lo inclina desde el apoyo.
    wobbler.current ??= new Wobbler(
      node,
      new Vector3(...project.position),
      project.wobble ?? DEFAULT_WOBBLE,
    );
    if (motionPrefs.reduced) wobbler.current.reset();
    else wobbler.current.update(delta);
  });

  const setHoverState = (value: boolean) => {
    setHovered(value);
    onHoverChange?.(value ? project : null);
  };

  const handleOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (!hovered && !motionPrefs.reduced) wobbler.current?.kick(HOVER_KICK);
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
