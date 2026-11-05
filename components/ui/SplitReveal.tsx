"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { EASE_OUT } from "./motion";

type SplitRevealProps = {
  text: string;
  /** Segundos antes de que arranque la primera palabra. */
  delay?: number;
  /** Segundos entre palabra y palabra. */
  stagger?: number;
  /** true: se anima al entrar en pantalla. false: al montarse. */
  inView?: boolean;
  className?: string;
  /** Clase extra para cada palabra (el span que se mueve). */
  wordClassName?: string;
};

/**
 * Cada palabra sube desde atrás de una máscara, una detrás de otra. La máscara
 * deja un margen abajo para no cortar los descendentes (g, j, p, y).
 */
export default function SplitReveal({
  text,
  delay = 0,
  stagger = 0.06,
  inView = false,
  className,
  wordClassName,
}: SplitRevealProps) {
  const reduce = useReducedMotion();
  const words = text.split(" ");

  // Con movimiento reducido no hay desplazamiento: sólo aparece.
  const word: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: (i: number) => ({
          opacity: 1,
          transition: { duration: 0.4, ease: EASE_OUT, delay: delay + i * stagger },
        }),
      }
    : {
        hidden: { transform: "translateY(110%)" },
        show: (i: number) => ({
          transform: "translateY(0%)",
          transition: { duration: 0.9, ease: EASE_OUT, delay: delay + i * stagger },
        }),
      };

  const trigger = inView
    ? { whileInView: "show", viewport: { once: true, amount: 0.6 } }
    : { animate: "show" };

  return (
    <motion.span initial="hidden" {...trigger} className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`}>
          <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-top">
            <motion.span
              custom={i}
              variants={word}
              className={wordClassName ? `inline-block ${wordClassName}` : "inline-block"}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );
}
