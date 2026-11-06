"use client";

import { useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { MAX_PITCH, MAX_YAW, motionPrefs, pointer, roomMotion, ROOM_PIVOT } from "./interaction";

/** Balanceo cuando nadie mueve el mouse (o en pantallas táctiles). */
const IDLE_YAW = 0.03;
const IDLE_PITCH = 0.014;
/** Tiempo sin mover el mouse hasta que arranca el balanceo. */
const IDLE_AFTER_MS = 2500;

/** Más bajo = más perezoso. Un poco de retraso es lo que lo hace hipnótico. */
const FOLLOW = 2.6;

/**
 * Inclina todo el cuarto alrededor de su centro visual siguiendo al puntero, y
 * publica su velocidad angular en `roomMotion` para que los objetos se tambaleen.
 *
 * Las luces quedan afuera a propósito: al inclinarse el cuarto bajo una luz
 * fija, las sombras y los reflejos se desplazan y el movimiento se lee como 3D
 * real, no como una imagen que rota.
 */
export default function TiltRig({ children }: { children: ReactNode }) {
  const rig = useRef<Group>(null);

  useFrame((state, delta) => {
    const node = rig.current;
    if (!node) return;
    const dt = Math.min(delta, 1 / 20);

    let yaw = 0;
    let pitch = 0;
    if (!motionPrefs.reduced) {
      const idle = !pointer.fine || performance.now() - pointer.lastMove > IDLE_AFTER_MS;
      if (idle) {
        // Dos senos con períodos no múltiplos: el recorrido nunca se repite igual.
        const t = state.clock.elapsedTime;
        yaw = IDLE_YAW * Math.sin(t * 0.31);
        pitch = IDLE_PITCH * Math.sin(t * 0.23 + 1.3);
      } else {
        yaw = pointer.x * MAX_YAW;
        pitch = -pointer.y * MAX_PITCH;
      }
    }

    const prevYaw = node.rotation.y;
    const prevPitch = node.rotation.x;
    node.rotation.y = MathUtils.damp(prevYaw, yaw, FOLLOW, dt);
    node.rotation.x = MathUtils.damp(prevPitch, pitch, FOLLOW, dt);

    roomMotion.yaw = node.rotation.y;
    roomMotion.pitch = node.rotation.x;
    roomMotion.yawVel = dt > 0 ? (node.rotation.y - prevYaw) / dt : 0;
    roomMotion.pitchVel = dt > 0 ? (node.rotation.x - prevPitch) / dt : 0;
  });

  return (
    <group ref={rig} position={ROOM_PIVOT}>
      <group position={[-ROOM_PIVOT.x, -ROOM_PIVOT.y, -ROOM_PIVOT.z]}>{children}</group>
    </group>
  );
}
