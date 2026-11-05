import Reveal from "@/components/ui/Reveal";
import SplitReveal from "@/components/ui/SplitReveal";
import TechBadge from "@/components/ui/TechBadge";
import { projects, type Project } from "@/lib/projects";

type ProjectListProps = {
  onSelect: (project: Project) => void;
};

/**
 * Los mismos proyectos del cuarto, en lista. También es el camino accesible:
 * a los objetos 3D no se llega con teclado ni con lector de pantalla.
 */
export default function ProjectList({ onSelect }: ProjectListProps) {
  return (
    <section id="proyectos" className="mx-auto w-full max-w-6xl px-6 py-24 sm:px-10 lg:px-16">
      <h2 className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-none text-amber-950">
        <SplitReveal inView text="Proyectos" />
      </h2>
      <Reveal delay={0.15}>
        <p className="mt-4 text-base text-amber-950/65">Los mismos del cuarto, en versión lista.</p>
      </Reveal>

      <ul className="mt-12 border-t border-amber-900/10">
        {projects.map((project, i) => (
          <li key={project.id} className="border-b border-amber-900/10">
            <Reveal delay={0.1 + i * 0.07}>
              <button
                type="button"
                onClick={() => onSelect(project)}
                className="group grid w-full grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-4 rounded-xl py-7 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-900/40 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-6"
              >
                <span className="font-display text-sm text-amber-900/40">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span>
                  <span className="flex items-center gap-3 font-display text-2xl text-amber-950 sm:text-3xl">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-150"
                      style={{ backgroundColor: project.accent }}
                    />
                    {project.name}
                    <span
                      aria-hidden
                      className="text-xl text-amber-900/40 transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-x-1.5"
                    >
                      →
                    </span>
                  </span>
                  <span className="mt-1.5 block text-xs font-medium tracking-[0.14em] text-amber-900/50 uppercase">
                    {project.context}
                  </span>
                  <span className="mt-3 block max-w-xl text-sm leading-relaxed text-amber-950/70 sm:text-base">
                    {project.description}
                  </span>
                </span>

                <span className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-3 sm:max-w-56 sm:justify-end">
                  {project.tech.map((tech) => (
                    <TechBadge key={tech} label={tech} />
                  ))}
                </span>
              </button>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
