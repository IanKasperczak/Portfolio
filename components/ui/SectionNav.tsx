"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export type NavSection = { id: string; label: string };

/** Qué altura de la pantalla cuenta como "estoy en esta sección". */
const ACTIVE_LINE = 0.4;

/**
 * Barrita fija a la derecha: dónde estás en la página y atajo para saltar.
 *
 * - La línea se va llenando con el scroll.
 * - Cada punto es una sección, ubicado donde empieza esa sección dentro del
 *   recorrido. Así la distancia entre la línea llena y el próximo punto dice
 *   cuánto falta para llegar.
 * - Click (o Enter) en un punto: va a esa sección. Con mouse, al pasar por
 *   encima aparece el nombre.
 */
export default function SectionNav({ sections }: { sections: NavSection[] }) {
  const { scrollYProgress } = useScroll();
  // String de transform completo: Motion lo aplica sin pasar por React.
  const fill = useTransform(scrollYProgress, (p) => `scaleY(${p})`);

  const [stops, setStops] = useState(() =>
    sections.map((_, i) => i / Math.max(1, sections.length - 1)),
  );
  const [active, setActive] = useState(0);

  // Dónde arranca cada sección, como fracción del scroll total. Se vuelve a
  // medir cuando cambia el alto de la página (fuentes, imágenes, resize).
  useEffect(() => {
    const measure = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setStops(
        sections.map((section) => {
          const el = document.getElementById(section.id);
          if (!el || max <= 0) return 0;
          const top = el.getBoundingClientRect().top + window.scrollY;
          return Math.min(1, Math.max(0, top / max));
        }),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    return () => observer.disconnect();
  }, [sections]);

  // Sección actual: la última cuyo comienzo ya pasó la línea de lectura. Al
  // fondo de la página, siempre la última (puede ser más corta que la pantalla).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      let current = 0;
      sections.forEach((section, i) => {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= window.innerHeight * ACTIVE_LINE) current = i;
      });
      setActive(atBottom ? sections.length - 1 : current);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [sections]);

  return (
    <nav
      aria-label="Secciones de la página"
      // Entra en el margen lateral de las secciones (px-6 / sm:px-10 / lg:px-16) sin tocar el texto.
      className="fixed top-1/2 right-1 z-20 -translate-y-1/2 sm:right-3 lg:right-5"
    >
      <div className="relative h-40 w-4 rounded-full bg-white/70 shadow-sm ring-1 ring-amber-900/15 backdrop-blur-sm sm:h-52 sm:w-5 lg:w-6">
        {/* Recorrido y progreso */}
        <div aria-hidden className="absolute inset-x-0 top-3.5 bottom-3.5 mx-auto w-px bg-amber-900/20">
          <motion.div className="absolute inset-0 origin-top bg-amber-900/65" style={{ transform: fill }} />
        </div>

        <ol className="absolute inset-x-0 top-3.5 bottom-3.5">
          {sections.map((section, i) => {
            const current = i === active;
            return (
              <li
                key={section.id}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ top: `${stops[i] * 100}%` }}
              >
                <a
                  href={`#${section.id}`}
                  aria-label={section.label}
                  aria-current={current ? "location" : undefined}
                  className="group relative grid size-6 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-900/50"
                >
                  <span
                    aria-hidden
                    className={`size-2 rounded-full border transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-out)] ${
                      current
                        ? "scale-[1.35] border-[#b8532f] bg-[#b8532f]"
                        : "border-amber-900/45 bg-[var(--background)] fine:group-hover:scale-125"
                    }`}
                  />
                  {/* Nombre de la sección: con mouse al pasar por encima, y con teclado al enfocar. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-full mr-2.5 translate-x-1 rounded-full bg-amber-950 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--background)] opacity-0 shadow-sm transition-[opacity,transform] duration-150 ease-[var(--ease-out)] group-focus-visible:translate-x-0 group-focus-visible:opacity-100 fine:group-hover:translate-x-0 fine:group-hover:opacity-100"
                  >
                    {section.label}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
