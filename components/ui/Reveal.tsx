"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "./motion";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  /** true: al entrar en pantalla (una sola vez). false: al montarse. */
  inView?: boolean;
  className?: string;
};

/** Bloque que aparece subiendo apenas. Con movimiento reducido, sólo aparece. */
export default function Reveal({ children, delay = 0, inView = true, className }: RevealProps) {
  const reduce = useReducedMotion();
  const hidden = reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(18px)" };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" };

  return (
    <motion.div
      className={className}
      initial={hidden}
      {...(inView
        ? { whileInView: shown, viewport: { once: true, amount: 0.25 } }
        : { animate: shown })}
      transition={{ duration: 0.8, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
