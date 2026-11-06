"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Scene from "@/components/Scene3D/Scene";
import Reveal from "@/components/ui/Reveal";
import RotatingWords from "@/components/ui/RotatingWords";
import SplitReveal from "@/components/ui/SplitReveal";
import SheenHeading from "@/components/ui/SheenHeading";
import { EASE_OUT } from "@/components/ui/motion";
import { about } from "@/lib/about";
import { projects, type Project } from "@/lib/projects";

/** Si el elemento está en pantalla. Arranca en true: el hero es lo primero que se ve. */
function useOnScreen(ref: RefObject<HTMLElement | null>) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}

type HeroProps = {
  onSelectProject: (project: Project) => void;
};

export default function Hero({ onSelectProject }: HeroProps) {
  const section = useRef<HTMLElement>(null);
  // Fuera de pantalla el canvas deja de renderizar: la sombra del fondo y el
  // post-processing no tienen por qué gastar GPU mientras se lee "Sobre mí".
  const visible = useOnScreen(section);
  const [hovered, setHovered] = useState<Project | null>(null);
  const reduce = useReducedMotion();

  return (
    <section
      ref={section}
      id="inicio"
      aria-label="Presentación"
      className="relative h-[100svh] min-h-[600px] w-full overflow-hidden"
    >
      <div className="absolute inset-0">
        <Scene active={visible} onSelectProject={onSelectProject} onHoverProject={setHovered} />
      </div>

      {/* Se funde con el fondo de la página al terminar el hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-linear-to-b from-transparent to-[var(--background)]"
      />

      {/* El texto no intercepta el puntero: el cuarto de atrás sigue respondiendo. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col px-6 pt-16 sm:px-10 sm:pt-20 wide:justify-center wide:px-16 wide:pt-0">
        {/* En wide el texto termina en 35vw: el cuarto arranca en 39vw (LAYOUTS en Scene.tsx). */}
        <div className="max-w-md wide:max-w-[min(32rem,calc(35vw-4rem))]">
          <Reveal inView={false} delay={0.1}>
            <p className="text-xs font-medium tracking-[0.22em] text-amber-900/60 uppercase">
              {about.name} · Portfolio
            </p>
          </Reveal>

          <SheenHeading className="mt-4 font-display text-[clamp(2.6rem,5.4vw,5rem)] leading-[0.95] text-amber-950">
            {about.greeting.map((line, i) => (
              <SplitReveal
                key={line}
                text={line}
                delay={0.2 + i * 0.12}
                className="block"
                wordClassName="sheen-word"
              />
            ))}
          </SheenHeading>

          <Reveal inView={false} delay={0.65}>
            <p className="mt-5 font-display text-[clamp(1.35rem,2.2vw,1.9rem)] leading-tight text-amber-950/75">
              Desarrollo
              <RotatingWords
                words={about.roles.map((role) => `${role}.`)}
                className="block text-[#b8532f]"
              />
            </p>
          </Reveal>

          <Reveal inView={false} delay={0.9}>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-pretty text-amber-950/70 sm:text-base">
              Este es mi cuarto en miniatura y cada objeto es un proyecto.{" "}
              <span className="hidden fine:inline">Mové el mouse y pasá por encima de los objetos.</span>
              <span className="fine:hidden">Tocá un objeto para ver de qué se trata.</span>
            </p>
          </Reveal>

          <Reveal inView={false} delay={1.05}>
            <a
              href="#sobre-mi"
              className="pointer-events-auto mt-8 inline-flex items-center gap-3 rounded-full text-sm font-medium text-amber-950/75 transition-colors duration-200 hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-900/40"
            >
              <span aria-hidden className="relative h-8 w-px overflow-hidden bg-amber-900/20">
                <span className="scroll-cue-dot absolute top-0 -left-0.5 h-1.5 w-[5px] rounded-full bg-amber-900/70" />
              </span>
              Conoceme
            </a>
          </Reveal>
        </div>
      </div>

      {/* Label bajo el cuarto: mismo centro horizontal que el layout de Scene.tsx. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[4%] z-10 flex justify-center wide:inset-x-auto wide:bottom-[6%] wide:left-[67%] wide:-translate-x-1/2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={hovered?.id ?? "hint"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_OUT } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="rounded-full bg-white/75 px-3.5 py-1.5 text-xs whitespace-nowrap text-amber-950/80 shadow-sm backdrop-blur-sm"
          >
            {hovered ? hovered.name : `${projects.length} proyectos · tocá uno para abrirlo`}
          </motion.span>
        </AnimatePresence>
      </div>
    </section>
  );
}
