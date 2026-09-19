"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Scene from "@/components/Scene3D/Scene";
import ProjectPanel from "@/components/ProjectPanel";
import type { Project } from "@/lib/projects";

export default function Home() {
  const [selected, setSelected] = useState<Project | null>(null);
  const [hovered, setHovered] = useState<Project | null>(null);

  const handleSelect = (project: Project) => {
    // Fase 1: el click sólo loguea. El detalle real viene después.
    console.log("Proyecto seleccionado:", project);
    setSelected(project);
  };

  return (
    <main className="relative flex min-h-full flex-1 flex-col">
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="px-6 pt-10 pb-6 sm:px-10 sm:pt-16"
      >
        <p className="text-xs font-medium tracking-[0.2em] text-amber-900/50 uppercase">
          Portfolio
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance text-amber-950 sm:text-5xl">
          Un escritorio en miniatura
        </h1>
        <p className="mt-3 max-w-xl text-sm text-pretty text-amber-950/70 sm:text-base">
          Cada objeto sobre el escritorio es un proyecto. Pasá el cursor para
          resaltarlo y tocá para abrir el detalle.
        </p>
      </motion.header>

      {/* El canvas vive en su propia sección con alto acotado: así no se come
          el layout ni rompe el scroll en mobile. */}
      <section className="relative h-[52svh] min-h-[280px] w-full sm:h-[62svh] sm:min-h-[420px]">
        <Scene onSelectProject={handleSelect} onHoverProject={setHovered} />

        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <span className="rounded-full bg-white/70 px-3 py-1 text-xs text-amber-950/70 backdrop-blur-sm">
            {hovered ? hovered.name : "Vista isométrica fija · 3 proyectos"}
          </span>
        </div>
      </section>

      <div className="flex-1 px-6 pt-8 pb-16 sm:px-10">
        <p className="text-sm text-amber-950/50">
          Placeholders de la Fase 1 — los modelos .glb reemplazan estas formas en
          el próximo paso.
        </p>
      </div>

      <ProjectPanel project={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
