"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE_IN_OUT } from "./motion";

type RotatingWordsProps = {
  words: string[];
  /** Milisegundos que queda cada palabra. */
  interval?: number;
  /** Retraso antes del primer cambio, para no pisar la entrada del hero. */
  startDelay?: number;
  className?: string;
};

/**
 * Una palabra que se va reemplazando: la actual sale hacia arriba y la nueva
 * entra desde abajo. Los lectores de pantalla leen la lista completa una vez.
 */
export default function RotatingWords({
  words,
  interval = 2600,
  startDelay = 1600,
  className,
}: RotatingWordsProps) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || words.length < 2) return;
    let timer: number;
    const start = window.setTimeout(() => {
      setIndex((i) => (i + 1) % words.length);
      timer = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    }, startDelay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [reduce, words.length, interval, startDelay]);

  return (
    <span className={className}>
      <span className="sr-only">{words.join(", ")}</span>
      <span aria-hidden className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={words[index]}
            className="inline-block whitespace-nowrap"
            // Se mueve en pantalla de punta a punta: ease-in-out.
            initial={{ transform: "translateY(100%)", opacity: 0 }}
            animate={{ transform: "translateY(0%)", opacity: 1 }}
            exit={{ transform: "translateY(-100%)", opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE_IN_OUT }}
          >
            {words[index]}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  );
}
