/**
 * Datos de los proyectos que se representan como objetos en el diorama 3D.
 * Por ahora son placeholders: cuando existan los .glb, cada proyecto va a
 * apuntar a un modelo en /public/models en vez de a una forma primitiva.
 */

export type ProjectShape = "box" | "cylinder" | "cone";

export type Project = {
  id: string;
  name: string;
  description: string;
  tech: string[];
  link?: string;
  /** Posición sobre el escritorio. El plano del escritorio es y = 0. */
  position: [number, number, number];
  /** Ancho / alto / profundidad del placeholder, en unidades de escena. */
  size: [number, number, number];
  shape: ProjectShape;
  /** Color base del objeto. */
  color: string;
  /** Color emissive que se enciende en hover. */
  accent: string;
};

export const projects: Project[] = [
  {
    id: "study-ai",
    name: "Study AI",
    description:
      "Asistente de estudio que genera resúmenes, flashcards y cuestionarios a partir de material propio.",
    tech: ["Next.js", "TypeScript", "OpenAI API", "PostgreSQL"],
    link: "#",
    position: [-3.4, 0, 1.1],
    size: [2, 1.5, 1.6],
    shape: "box",
    color: "#e8734a",
    accent: "#ffb27a",
  },
  {
    id: "proyecto-facultad",
    name: "Proyecto grupal (facultad)",
    description:
      "Trabajo integrador en equipo: relevamiento, diseño de la base de datos e implementación de la app.",
    tech: ["React", "Node.js", "Express", "MySQL"],
    link: "#",
    position: [0.1, 0, -0.8],
    size: [1.6, 2.2, 1.6],
    shape: "cylinder",
    color: "#4f9d8b",
    accent: "#8fe0cd",
  },
  {
    id: "automation-bot",
    name: "Bot de automatización",
    description:
      "Bot que automatiza tareas repetitivas y notifica resultados, con scheduling y manejo de errores.",
    tech: ["Python", "Playwright", "Docker", "Cron"],
    link: "#",
    position: [3.3, 0, 1.3],
    size: [1.7, 1.9, 1.7],
    shape: "cone",
    color: "#d8a83c",
    accent: "#ffd978",
  },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}
