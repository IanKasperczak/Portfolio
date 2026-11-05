"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, MathUtils } from "three";
import { FluidSim, type FluidConfig } from "./fluidSim";
import { motionPrefs, pointer, viewLayout } from "./interaction";

/**
 * Capa de la cámara en la que vive el fondo. Va separada para que ninguna
 * cámara auxiliar lo vea: ContactShadows renderiza la escena desde abajo con un
 * material de profundidad propio, y vería este plano como una pared en el origen.
 */
export const BACKGROUND_LAYER = 1;

const DESKTOP: FluidConfig = {
  simResolution: 128,
  dyeResolution: 640,
  pressureIterations: 20,
  curl: 24,
  velocityDissipation: 0.3,
  densityDissipation: 0.32,
  pressure: 0.8,
  splatRadius: 0.22,
};

const MOBILE: FluidConfig = {
  ...DESKTOP,
  simResolution: 96,
  dyeResolution: 384,
  pressureIterations: 14,
};

/** Fuerza con la que el movimiento del puntero empuja el fluido. */
const SPLAT_FORCE = 6000;
/** Sin mover el mouse este tiempo, el fondo pasa a moverse solo. */
const IDLE_AFTER_MS = 3000;

/**
 * Tintas, en el color que dejan sobre el fondo, ordenadas por tono: la deriva
 * pasa de una a la vecina, y entre vecinas la mezcla queda limpia. (Interpolar
 * entre tonos opuestos, como un verde agua y un ocre, da un oliva barroso.)
 * Del ámbar de la madera al azul de la pared del cuarto.
 */
const INKS = ["#e9a15e", "#c9603a", "#a8475a", "#6f5288", "#4f6d91"].map((hex) => new Color(hex));
/** Cuántas tintas por segundo recorre la paleta: el color del trazo deriva solo. */
const INK_DRIFT = 0.06;

/**
 * Tinta actual de la paleta, interpolada en el tiempo. Va y vuelve (ámbar →
 * azul → ámbar) en vez de dar la vuelta: así nunca salta de un extremo al otro.
 */
function inkAt(time: number, out: Color) {
  const span = INKS.length - 1;
  const cycle = (time * INK_DRIFT) % (span * 2);
  const phase = cycle <= span ? cycle : span * 2 - cycle;
  const index = Math.min(Math.floor(phase), span - 1);
  return out.lerpColors(INKS[index], INKS[index + 1], phase - index);
}

/**
 * Absorción que, sobre un fondo blanco, deja exactamente ese color con
 * `amount` = 1 (Beer–Lambert: color = e^-absorción). Con `1 - color` el tono
 * se lavaba y las tintas se veían grises.
 */
function absorptionOf(ink: Color, amount: number, out: Color) {
  const a = (channel: number) => -Math.log(Math.max(channel, 0.02)) * amount;
  return out.setRGB(a(ink.r), a(ink.g), a(ink.b));
}

export default function FluidBackground() {
  const gl = useThree((state) => state.gl);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);

  const [fluid] = useState(
    () =>
      new FluidSim(gl, width < 768 ? MOBILE : DESKTOP, {
        center: "#faf1e4",
        edge: "#e6cfb1",
        strength: 1.1,
      }),
  );
  const ink = useRef(new Color());
  const absorption = useRef(new Color());
  const ghost = useRef({ u: 0.5, v: 0.5, ready: false });

  useEffect(() => {
    fluid.resize(width, height);
  }, [fluid, width, height]);

  useEffect(() => () => fluid.dispose(), [fluid]);

  useFrame((state, delta) => {
    fluid.setCenter(viewLayout.cx, viewLayout.cy);

    // Movimiento reducido: queda el fondo quieto, sin tinta.
    if (motionPrefs.reduced) {
      pointer.du = pointer.dv = 0;
      return;
    }

    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    inkAt(time, ink.current);

    if (pointer.inside && (pointer.du !== 0 || pointer.dv !== 0)) {
      // Un salto grande (por ejemplo, al volver a la pestaña) no es un gesto.
      const du = MathUtils.clamp(pointer.du, -0.08, 0.08);
      const dv = MathUtils.clamp(pointer.dv, -0.08, 0.08);
      // Más rápido = más tinta: pasar lento sólo agita, un gesto rápido pinta.
      const amount = MathUtils.clamp(Math.hypot(du, dv) * 10, 0.035, 0.18);
      fluid.splat(pointer.u, pointer.v, du * SPLAT_FORCE, dv * SPLAT_FORCE, absorptionOf(ink.current, amount, absorption.current));
    }
    pointer.du = pointer.dv = 0;

    // Cursor fantasma: recorre el canvas despacio cuando nadie lo mueve, así
    // el fondo nunca queda quieto. Dos senos con períodos distintos: no se repite.
    const idle = !pointer.fine || performance.now() - pointer.lastMove > IDLE_AFTER_MS;
    const g = ghost.current;
    if (idle) {
      const u = 0.5 + 0.38 * Math.sin(time * 0.17);
      const v = 0.5 + 0.3 * Math.sin(time * 0.23 + 1.1);
      if (g.ready) {
        fluid.splat(u, v, (u - g.u) * SPLAT_FORCE * 3, (v - g.v) * SPLAT_FORCE * 3, absorptionOf(ink.current, 0.008, absorption.current));
      }
      g.u = u;
      g.v = v;
      g.ready = true;
    } else {
      g.ready = false;
    }

    fluid.step(dt);
  });

  return (
    <mesh
      layers={BACKGROUND_LAYER}
      renderOrder={-1000}
      frustumCulled={false}
      material={fluid.displayMaterial}
    >
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}
