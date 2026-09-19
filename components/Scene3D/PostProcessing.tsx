"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  DepthOfField,
  EffectComposer,
  TiltShift2,
  Vignette,
  type TiltShiftEffect,
} from "@react-three/postprocessing";
import type { DepthOfFieldEffect } from "postprocessing";
import { MathUtils, Vector3 } from "three";
import type { Project } from "@/lib/projects";

/**
 * Look "diorama en miniatura", con dos estados:
 *
 * - Reposo: blur casi imperceptible, sólo en lo más alejado de la cámara.
 * - Con un objeto resaltado: el foco se mueve a ese objeto y el resto de la
 *   escena se desenfoca un poco más, dejándolo bien nítido.
 *
 * El trabajo pesado lo hace el DepthOfField porque es depth-aware: enfoca por
 * distancia real a la cámara, así que el objeto apuntado queda nítido esté
 * donde esté en pantalla. El TiltShift2 es screen-space (no sabe de
 * profundidad), así que se mantiene muy bajo: sólo aporta el degradé de
 * miniatura, nunca es el que desenfoca el fondo en hover.
 *
 * IMPORTANTE: en postprocessing 6.x, `focusDistance` y `focusRange` están en
 * UNIDADES DE MUNDO, no normalizados 0-1. El shader hace:
 *
 *   smoothstep(0, focusRange, |length(viewPosition) - focusDistance|)
 *
 * Como referencia, la cámara está a ~20 unidades del centro del escritorio y
 * la profundidad total de la escena es de ~14 unidades.
 */

/** Punto que se mantiene enfocado cuando no hay nada resaltado. */
const SCENE_CENTER: [number, number, number] = [0, 0.6, 0];

export type FocusSettings = {
  /** Unidades de mundo que quedan nítidas alrededor del foco. Más alto = más nítido todo. */
  focusRange: number;
  /** Radio del bokeh: cuánto blur llega a tener lo que queda fuera de foco. */
  bokehScale: number;
  /** Tilt-shift screen-space. Se mantiene bajo a propósito. */
  tiltShift: number;
};

/** Reposo: rango enorme + bokeh chico = sólo las esquinas lejanas se ablandan. */
export const IDLE_FOCUS: FocusSettings = {
  focusRange: 10,
  bokehScale: 1.3,
  tiltShift: 0.06,
};

/** Hover: rango corto + bokeh medio = el objeto nítido y el fondo atrás. */
export const ACTIVE_FOCUS: FocusSettings = {
  focusRange: 3.4,
  bokehScale: 3.2,
  tiltShift: 0.1,
};

/** Velocidad de la transición entre ambos estados. */
const DAMP = 4.5;

export type PostProcessingProps = {
  /** Proyecto resaltado, o null para volver al foco del centro de la escena. */
  focusProject?: Project | null;
  idle?: FocusSettings;
  active?: FocusSettings;
  /** Permite desactivar todo el pipeline (por ejemplo, en equipos lentos). */
  enabled?: boolean;
};

export default function PostProcessing({
  focusProject = null,
  idle = IDLE_FOCUS,
  active = ACTIVE_FOCUS,
  enabled = true,
}: PostProcessingProps) {
  const depthOfField = useRef<DepthOfFieldEffect>(null);
  const tiltShift = useRef<TiltShiftEffect>(null);
  // Vector de scratch: se reusa cada frame para no generar basura.
  const desiredTarget = useRef(new Vector3()).current;

  useFrame((_, delta) => {
    const dof = depthOfField.current;
    const tilt = tiltShift.current;
    const settings = focusProject ? active : idle;

    if (dof?.target) {
      if (focusProject) {
        // El centro del objeto, no su base: es lo que tiene que quedar nítido.
        desiredTarget.set(
          focusProject.position[0],
          focusProject.position[1] + focusProject.size[1] / 2,
          focusProject.position[2],
        );
      } else {
        desiredTarget.set(...SCENE_CENTER);
      }

      // El efecto lee `target` en cada update(), así que alcanza con mover el
      // vector para animar el foco.
      dof.target.x = MathUtils.damp(dof.target.x, desiredTarget.x, DAMP, delta);
      dof.target.y = MathUtils.damp(dof.target.y, desiredTarget.y, DAMP, delta);
      dof.target.z = MathUtils.damp(dof.target.z, desiredTarget.z, DAMP, delta);

      dof.cocMaterial.focusRange = MathUtils.damp(
        dof.cocMaterial.focusRange,
        settings.focusRange,
        DAMP,
        delta,
      );
      dof.bokehScale = MathUtils.damp(
        dof.bokehScale,
        settings.bokehScale,
        DAMP,
        delta,
      );
    }

    if (tilt) {
      tilt.blur = MathUtils.damp(tilt.blur, settings.tiltShift, DAMP, delta);
    }
  });

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={4}>
      {/* Las props de abajo sólo fijan el valor inicial: a partir del primer
          frame los anima el useFrame de arriba. */}
      <DepthOfField
        ref={depthOfField}
        target={SCENE_CENTER}
        focusRange={idle.focusRange}
        bokehScale={idle.bokehScale}
        resolutionScale={1}
      />
      <TiltShift2
        ref={tiltShift}
        blur={idle.tiltShift}
        taper={0.6}
        start={[0, 0.2]}
        end={[0, 0.85]}
        samples={8}
      />
      <Vignette offset={0.3} darkness={0.45} eskil={false} />
    </EffectComposer>
  );
}
