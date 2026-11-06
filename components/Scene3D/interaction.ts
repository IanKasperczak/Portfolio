"use client";

import { useEffect } from "react";
import { MathUtils, Vector3, type Object3D } from "three";

/**
 * Estado compartido de la interacción con el diorama.
 *
 * Son objetos mutables a nivel de módulo, no estado de React: los leen y
 * escriben los `useFrame` de varias piezas (inclinación del cuarto, tambaleo,
 * sombra del fondo) 60 veces por segundo, y pasarlos por React haría re-renderizar el
 * canvas en cada movimiento del mouse.
 */

/** Posición del puntero, actualizada desde `window` (funciona aunque haya texto encima del canvas). */
export const pointer = {
  /** -1..1 respecto del centro del cuarto en pantalla. Y hacia arriba. */
  x: 0,
  y: 0,
  /** Coordenadas UV dentro del canvas (0..1, Y hacia arriba). */
  u: 0.5,
  v: 0.5,
  /** `performance.now()` del último movimiento. */
  lastMove: Number.NEGATIVE_INFINITY,
  /** Mouse o trackpad. En pantallas táctiles el cuarto no sigue al dedo. */
  fine: false,
};

/** Preferencia del sistema operativo de reducir el movimiento. */
export const motionPrefs = { reduced: false };

/** Centro del cuarto en pantalla, en UV del canvas. Lo fija la cámara según el layout. */
export const viewLayout = { cx: 0.5, cy: 0.5 };

/**
 * Inclinación actual del cuarto (rad) y su velocidad angular (rad/s). La
 * escribe TiltRig; la leen los objetos que se tambalean y el título, que
 * inclina sus letras igual que el cuarto.
 */
export const roomMotion = { yaw: 0, pitch: 0, yawVel: 0, pitchVel: 0 };

/**
 * Lo que proyecta sombra sobre el fondo: el cuarto con sus objetos (sin la
 * sombra de contacto, que es un plano). Lo registra Room y lo lee Backdrop.
 */
export const shadowCaster: { object: Object3D | null } = { object: null };

/** Giro máximo del cuarto siguiendo al mouse (rad). Unos 4° y 2°: se siente, no marea. */
export const MAX_YAW = 0.07;
export const MAX_PITCH = 0.035;

/** Punto alrededor del que se inclina el cuarto: su centro visual. */
export const ROOM_PIVOT = new Vector3(-0.88, 1.92, -0.88);

/** Escucha el puntero sobre `window` y lo traduce a coordenadas del canvas. */
export function usePointerTracking(canvas: HTMLElement) {
  useEffect(() => {
    const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncQueries = () => {
      pointer.fine = fineQuery.matches;
      motionPrefs.reduced = reducedQuery.matches;
    };
    syncQueries();

    const handleMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const u = (event.clientX - rect.left) / rect.width;
      const v = 1 - (event.clientY - rect.top) / rect.height;

      pointer.u = u;
      pointer.v = v;
      pointer.x = MathUtils.clamp((u - viewLayout.cx) / 0.5, -1, 1);
      pointer.y = MathUtils.clamp((v - viewLayout.cy) / 0.5, -1, 1);
      pointer.lastMove = performance.now();
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    fineQuery.addEventListener("change", syncQueries);
    reducedQuery.addEventListener("change", syncQueries);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      fineQuery.removeEventListener("change", syncQueries);
      reducedQuery.removeEventListener("change", syncQueries);
    };
  }, [canvas]);
}

export type WobbleSettings = {
  /** Rigidez del resorte. Más alto = oscila más rápido. */
  stiffness: number;
  /** Amortiguación. Más bajo = sigue oscilando más tiempo. */
  damping: number;
  /** Cuánto se inclina por cada unidad/s de velocidad del piso. */
  response: number;
};

export const DEFAULT_WOBBLE: WobbleSettings = {
  stiffness: 140,
  damping: 5,
  response: 0.04,
};

const MAX_LEAN = 0.3;
const SUBSTEP = 1 / 120;

/**
 * Tambaleo tipo gelatina de un objeto apoyado en el cuarto.
 *
 * Cuando el cuarto gira, el piso bajo el objeto se desplaza (ω × r). El objeto
 * "llega tarde": se inclina en contra de ese movimiento y vuelve a su lugar con
 * un resorte poco amortiguado, así que rebota un par de veces al frenar. Como
 * cada objeto está en otra posición y tiene otro resorte, no se mueven en
 * bloque, y eso es lo que los hace parecer vivos.
 *
 * Rota `object` alrededor de su propio origen, que tiene que estar en la base.
 */
export class Wobbler {
  private leanX = 0;
  private leanZ = 0;
  private velX = 0;
  private velZ = 0;

  constructor(
    private readonly object: Object3D,
    /** Posición de la base en el espacio del cuarto. */
    private readonly anchor: Vector3,
    private readonly settings: WobbleSettings = DEFAULT_WOBBLE,
  ) {}

  /** Empujoncito (rad/s) hacia la cámara, por ejemplo al pasar el cursor. */
  kick(strength: number) {
    this.velX += strength;
    this.velZ -= strength;
  }

  update(delta: number) {
    const { stiffness, damping, response } = this.settings;

    const px = this.anchor.x - ROOM_PIVOT.x;
    const py = this.anchor.y - ROOM_PIVOT.y;
    const pz = this.anchor.z - ROOM_PIVOT.z;

    // Velocidad horizontal del piso en este punto: ω × r.
    const floorX = roomMotion.yawVel * pz;
    const floorZ = -roomMotion.yawVel * px + roomMotion.pitchVel * py;

    // rotation.z > 0 lleva la punta hacia -X; rotation.x > 0, hacia +Z.
    const targetX = MathUtils.clamp(-floorZ * response, -MAX_LEAN, MAX_LEAN);
    const targetZ = MathUtils.clamp(floorX * response, -MAX_LEAN, MAX_LEAN);

    // Pasos fijos: un resorte poco amortiguado con dt variable puede explotar.
    let remaining = Math.min(delta, 1 / 20);
    while (remaining > 1e-6) {
      const dt = Math.min(SUBSTEP, remaining);
      this.velX += (stiffness * (targetX - this.leanX) - damping * this.velX) * dt;
      this.velZ += (stiffness * (targetZ - this.leanZ) - damping * this.velZ) * dt;
      this.leanX += this.velX * dt;
      this.leanZ += this.velZ * dt;
      remaining -= dt;
    }

    this.leanX = MathUtils.clamp(this.leanX, -MAX_LEAN, MAX_LEAN);
    this.leanZ = MathUtils.clamp(this.leanZ, -MAX_LEAN, MAX_LEAN);
    this.object.rotation.x = this.leanX;
    this.object.rotation.z = this.leanZ;
  }

  /** Vuelve a la posición de reposo (por ejemplo, con movimiento reducido). */
  reset() {
    this.leanX = this.leanZ = this.velX = this.velZ = 0;
    this.object.rotation.x = 0;
    this.object.rotation.z = 0;
  }
}
