"use client";

import { useState } from "react";
import ProjectPanel from "@/components/ProjectPanel";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import ProjectList from "@/components/sections/ProjectList";
import SectionNav, { type NavSection } from "@/components/ui/SectionNav";
import type { Project } from "@/lib/projects";

/** Mismos ids que las secciones. Fuera del componente: SectionNav mide cuando cambia. */
const SECTIONS: NavSection[] = [
  { id: "inicio", label: "Inicio" },
  { id: "sobre-mi", label: "Sobre mí" },
  { id: "proyectos", label: "Proyectos" },
  { id: "contacto", label: "Contacto" },
];

export default function Home() {
  // El panel de detalle se abre tanto desde el cuarto como desde la lista.
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <main className="relative flex flex-1 flex-col">
      <Hero onSelectProject={setSelected} />
      <About />
      <ProjectList onSelect={setSelected} />
      <Contact />
      <SectionNav sections={SECTIONS} />
      <ProjectPanel project={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
