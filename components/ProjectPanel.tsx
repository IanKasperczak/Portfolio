"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Project } from "@/lib/projects";
import { EASE_OUT } from "./ui/motion";
import TechBadge from "./ui/TechBadge";

type ProjectPanelProps = {
  project: Project | null;
  onClose: () => void;
};

/** Ficha del proyecto que se abre al tocar un objeto del cuarto o un item de la lista. */
export default function ProjectPanel({ project, onClose }: ProjectPanelProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!project) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [project, onClose]);

  const hidden = reduce ? { opacity: 0 } : { opacity: 0, transform: "translateY(16px)" };
  const shown = reduce ? { opacity: 1 } : { opacity: 1, transform: "translateY(0px)" };

  return (
    <AnimatePresence>
      {project && (
        <motion.aside
          key={project.id}
          aria-label={project.name}
          initial={hidden}
          animate={shown}
          exit={{ ...hidden, transition: { duration: 0.18, ease: EASE_OUT } }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className="pointer-events-auto fixed inset-x-4 bottom-4 z-20 rounded-2xl border border-amber-900/10 bg-white/85 p-6 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[25rem]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-medium tracking-[0.14em] text-amber-900/50 uppercase">
                {project.context}
              </p>
              <h2 className="mt-1 font-display text-2xl leading-tight text-amber-950">{project.name}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-full text-amber-900/60 transition-colors duration-150 hover:bg-amber-900/10 hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-amber-900/40"
            >
              <span aria-hidden>✕</span>
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-pretty text-amber-950/75">{project.description}</p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tech.map((tech) => (
              <TechBadge key={tech} label={tech} />
            ))}
          </div>

          {project.links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-amber-900/10 pt-5">
              {project.links.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900/40 ${
                    i === 0
                      ? "bg-amber-950 text-[var(--background)] hover:bg-amber-900"
                      : "border border-amber-900/20 text-amber-950 hover:bg-amber-900/10"
                  }`}
                >
                  {link.label}
                  <span aria-hidden>↗</span>
                </a>
              ))}
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
