"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Vignette } from "@react-three/postprocessing";
import { MathUtils } from "three";
import type { Project } from "@/lib/projects";
import { FocusBlurEffect } from "./FocusBlurEffect";
import { viewLayout } from "./interaction";

/**
 * Look "diorama en miniatura", con dos estados:
 *
 * - Reposo: todo nítido salvo un blur casi imperceptible en las esquinas.
 * - Con un objeto resaltado: se desenfoca toda la escena menos ese objeto,
 *   y su silueta se rodea de un halo con el color de acento del proyecto.
 *
 * Todo lo hace FocusBlurEffect (ver ahí por qué no se usa DepthOfField).
 */

/** Blur de las esquinas en reposo (0 = nada, 1 = totalmente desenfocado). */
const EDGE_BLUR = 0.35;
/** Cuánto se desenfoca el resto de la escena con un objeto resaltado. */
const FOCUS_BLUR = 0.85;
/** Intensidad del halo alrededor de la silueta resaltada. */
const GLOW = 1.1;
/** Velocidad de la transición entre ambos estados. */
const DAMP = 6;

export type PostProcessingProps = {
  /** Proyecto resaltado, o null para volver al estado de reposo. */
  focusProject?: Project | null;
  /** Permite desactivar todo el pipeline (por ejemplo, en equipos lentos). */
  enabled?: boolean;
};

export default function PostProcessing({
  focusProject = null,
  enabled = true,
}: PostProcessingProps) {
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const focusBlur = useRef<FocusBlurEffect>(null);
  const effect = useMemo(() => new FocusBlurEffect({ edgeStrength: EDGE_BLUR }), []);

  useEffect(() => () => effect.dispose(), [effect]);

  useFrame((_, delta) => {
    const blur = focusBlur.current;
    if (!blur) return;

    blur.camera = camera;
    blur.setCenter(viewLayout.cx, viewLayout.cy);
    blur.focusStrength = MathUtils.damp(
      blur.focusStrength,
      focusProject ? FOCUS_BLUR : 0,
      DAMP,
      delta,
    );

    blur.glowStrength = MathUtils.damp(
      blur.glowStrength,
      focusProject ? GLOW : 0,
      DAMP,
      delta,
    );

    if (focusProject) {
      // Cada ProjectObject se llama como el id de su proyecto.
      blur.focusObject = scene.getObjectByName(focusProject.id) ?? null;
      blur.glowColor.set(focusProject.accent);
    } else if (blur.focusStrength < 0.01 && blur.glowStrength < 0.01) {
      // Se mantiene la máscara durante el fade-out para que el objeto no se
      // desenfoque de golpe al sacar el cursor.
      blur.focusObject = null;
    }
  });

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      <primitive ref={focusBlur} object={effect} dispose={null} />
      <Vignette offset={0.35} darkness={0.22} eskil={false} />
    </EffectComposer>
  );
}
