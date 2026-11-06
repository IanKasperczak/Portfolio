"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAnimationFrame } from "framer-motion";
import { pointer } from "@/components/Scene3D/interaction";

/** Qué tan rápido la luz alcanza al cursor (1/s). Un poco de inercia la hace sentir física. */
const LIGHT_FOLLOW = 9;
/** Qué tan rápido se prende y se apaga la luz cuando el mouse entra o sale de la ventana. */
const LIGHT_FADE = 4;

function setIfChanged(el: HTMLElement, property: string, value: string) {
  if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value);
}

type SheenHeadingProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Título al que el mouse le pasa una luz por encima. Las palabras con
 * `.sheen-word` (globals.css) pintan un reflejo en (--sx, --sy) con
 * intensidad --si; acá se calcula esa posición para cada palabra. Sólo con
 * mouse: en pantallas táctiles no hay cursor que ilumine.
 */
export default function SheenHeading({ children, className }: SheenHeadingProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const light = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, on: 0, targetOn: 0, placed: false });

  useEffect(() => {
    const l = light.current;
    const handleMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      l.targetX = event.clientX;
      l.targetY = event.clientY;
      l.targetOn = 1;
      // La primera vez la luz aparece donde está el cursor, no viaja desde (0, 0).
      if (!l.placed) {
        l.x = l.targetX;
        l.y = l.targetY;
        l.placed = true;
      }
    };
    const handleLeave = () => {
      l.targetOn = 0;
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handleLeave);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.documentElement.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  useAnimationFrame((_, deltaMs) => {
    const el = heading.current;
    if (!el) return;

    const l = light.current;
    if (!pointer.fine) l.targetOn = 0;
    // Apagada y sin cambios: no hay nada que repintar.
    if (l.on < 0.001 && l.targetOn === 0) return;

    const dt = Math.min(deltaMs / 1000, 0.1);
    const follow = 1 - Math.exp(-LIGHT_FOLLOW * dt);
    l.x += (l.targetX - l.x) * follow;
    l.y += (l.targetY - l.y) * follow;
    l.on += (l.targetOn - l.on) * (1 - Math.exp(-LIGHT_FADE * dt));
    if (l.on < 0.001 && l.targetOn === 0) l.on = 0;

    // Cada palabra necesita la luz en sus propias coordenadas: el fondo
    // recortado al texto se posiciona respecto de su caja.
    for (const word of el.querySelectorAll<HTMLElement>(".sheen-word")) {
      const rect = word.getBoundingClientRect();
      // Medio píxel de resolución: con el mouse quieto deja de repintar.
      setIfChanged(word, "--sx", `${Math.round((l.x - rect.left) * 2) / 2}px`);
      setIfChanged(word, "--sy", `${Math.round((l.y - rect.top) * 2) / 2}px`);
      setIfChanged(word, "--si", l.on.toFixed(2));
    }
  });

  return (
    <h1 ref={heading} className={className}>
      {children}
    </h1>
  );
}
