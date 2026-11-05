"use client";

import { useState } from "react";
import ProjectPanel from "@/components/ProjectPanel";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";
import Hero from "@/components/sections/Hero";
import ProjectList from "@/components/sections/ProjectList";
import type { Project } from "@/lib/projects";

export default function Home() {
  // El panel de detalle se abre tanto desde el cuarto como desde la lista.
  const [selected, setSelected] = useState<Project | null>(null);

  return (
    <main className="relative flex flex-1 flex-col">
      <Hero onSelectProject={setSelected} />
      <About />
      <ProjectList onSelect={setSelected} />
      <Contact />
      <ProjectPanel project={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
