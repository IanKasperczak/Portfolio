"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Project } from "@/lib/projects";
import TechBadge from "./ui/TechBadge";

/**
 * Placeholder del panel de detalle. Por ahora sólo muestra los datos de
 * lib/projects.ts; el contenido real (capturas, video, caso de estudio) viene
 * en la próxima fase.
 */

type ProjectPanelProps = {
  project: Project | null;
  onClose: () => void;
};

export default function ProjectPanel({ project, onClose }: ProjectPanelProps) {
  return (
    <AnimatePresence>
      {project && (
        <motion.aside
          key={project.id}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="pointer-events-auto fixed inset-x-4 bottom-4 z-20 rounded-2xl border border-amber-900/10 bg-white/85 p-5 shadow-xl backdrop-blur-md sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem]"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg font-semibold text-amber-950">
              {project.name}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar panel"
              className="-mr-1 -mt-1 rounded-full px-2 py-1 text-amber-900/60 transition hover:bg-amber-900/10 hover:text-amber-900"
            >
              ✕
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-amber-950/75">
            {project.description}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {project.tech.map((tech) => (
              <TechBadge key={tech} label={tech} />
            ))}
          </div>

          <p className="mt-4 text-xs text-amber-900/50">
            Panel placeholder — el detalle completo llega en la próxima fase.
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
