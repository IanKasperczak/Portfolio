/**
 * Datos de los proyectos que se representan como objetos en el diorama 3D.
 * Cada proyecto apunta a su modelo en /public/models (fuente editable en
 * blender/diorama.blend).
 */

export type Project = {
  id: string;
  name: string;
  description: string;
  tech: string[];
  link?: string;
  /** Modelo .glb servido desde /public/models. Su origen está en la base. */
  model: string;
  /** Posición de la base del modelo dentro del cuarto. El piso es y = 0. */
  position: [number, number, number];
  /** Caja aproximada que ocupa el modelo (ancho / alto / profundidad), en unidades de escena. */
  size: [number, number, number];
  /** Color del brillo que rodea la silueta del objeto en hover. */
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
    model: "/models/books.glb",
    position: [-2.45, 0, 0.55],
    size: [1.6, 1.1, 1.5],
    accent: "#ffb27a",
  },
  {
    id: "proyecto-facultad",
    name: "Proyecto grupal (facultad)",
    description:
      "Trabajo integrador en equipo: relevamiento, diseño de la base de datos e implementación de la app.",
    tech: ["React", "Node.js", "Express", "MySQL"],
    link: "#",
    model: "/models/laptop.glb",
    // Apoyada sobre el escritorio, cuya superficie está a y = 1.7.
    position: [0.25, 1.7, -3.0],
    size: [1.8, 1.0, 1.6],
    accent: "#8fe0cd",
  },
  {
    id: "automation-bot",
    name: "Bot de automatización",
    description:
      "Bot que automatiza tareas repetitivas y notifica resultados, con scheduling y manejo de errores.",
    tech: ["Python", "Playwright", "Docker", "Cron"],
    link: "#",
    model: "/models/robot.glb",
    position: [1.95, 0, 1.45],
    size: [1.1, 1.75, 1.3],
    accent: "#ffd978",
  },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}
