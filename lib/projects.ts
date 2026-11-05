import type { WobbleSettings } from "@/components/Scene3D/interaction";

/**
 * Datos de los proyectos que se representan como objetos en el diorama 3D.
 * Cada proyecto apunta a su modelo en /public/models (fuente editable en
 * blender/diorama.blend).
 */

export type ProjectLink = { label: string; href: string };

export type Project = {
  id: string;
  name: string;
  /** Contexto corto: de dónde sale el proyecto. */
  context: string;
  description: string;
  tech: string[];
  links: ProjectLink[];
  /** Modelo .glb servido desde /public/models. Su origen está en la base. */
  model: string;
  /** Posición de la base del modelo dentro del cuarto. El piso es y = 0. */
  position: [number, number, number];
  /** Caja aproximada que ocupa el modelo (ancho / alto / profundidad), en unidades de escena. */
  size: [number, number, number];
  /** Color del brillo que rodea la silueta del objeto en hover. */
  accent: string;
  /** Cómo se tambalea cuando se mueve el cuarto. Sin definir usa DEFAULT_WOBBLE. */
  wobble?: WobbleSettings;
};

export const projects: Project[] = [
  {
    id: "study-ai",
    name: "Study AI",
    context: "Proyecto personal",
    description:
      "Una app para estudiar con IA. Subís tus apuntes (PDF, DOCX, TXT) y los ordena sola en temas y subtemas. Después te arma resúmenes, explicaciones simples y quizzes, y tiene un chat que responde sobre tu propio material con RAG.",
    tech: ["Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI", "RAG"],
    links: [
      { label: "Ver la app", href: "https://study-ai-hazel.vercel.app/" },
      { label: "Código", href: "https://github.com/IanKasperczak/study-ai" },
    ],
    model: "/models/books.glb",
    position: [-2.45, 0, 0.55],
    size: [1.6, 1.1, 1.5],
    accent: "#ffb27a",
    // Pila de libros: se bambolea un poco, sin perder la compostura.
    wobble: { stiffness: 150, damping: 5, response: 0.035 },
  },
  {
    id: "gimnasio",
    name: "Sistema para un gimnasio",
    context: "TP de Desarrollo de Software · UTN",
    description:
      "Trabajo integrador en equipo de tres. Los clientes reservan turnos en clases con cupo, y el gimnasio gestiona membresías, rutinas y asistencia. Cada rol (administrador, profesor, cliente) entra con su cuenta y sus permisos.",
    tech: ["React", "TypeScript", "Material UI", "Node.js", "Express", "PostgreSQL", "Sequelize"],
    links: [
      { label: "Ver la app", href: "https://trabajo-dsw-frontend.vercel.app/" },
      { label: "Frontend", href: "https://github.com/IanKasperczak/Trabajo-Desarrollo-Frontend" },
      { label: "Backend", href: "https://github.com/Campesianoo/Trabajo-Desarrollo" },
    ],
    model: "/models/laptop.glb",
    // Apoyada sobre el escritorio, cuya superficie está a y = 1.7.
    position: [0.25, 1.7, -3.0],
    size: [1.8, 1.0, 1.6],
    accent: "#8fe0cd",
    // Notebook: rígida y plana, casi no se mueve.
    wobble: { stiffness: 300, damping: 14, response: 0.015 },
  },
  {
    id: "lince",
    name: "Lince",
    context: "Con amigos de la facultad · 2026 – hoy",
    description:
      "Un proyecto que armamos entre estudiantes. Analizamos cómo trabaja cada negocio y le hacemos webs, apps y automatizaciones a medida para sacarle de encima las tareas manuales.",
    tech: ["Análisis de procesos", "Aplicaciones web", "APIs REST", "Automatización"],
    links: [{ label: "lince-automate.com.ar", href: "https://lince-automate.com.ar" }],
    model: "/models/robot.glb",
    position: [1.95, 0, 1.45],
    size: [1.1, 1.75, 1.3],
    accent: "#ffd978",
    // Robot: alto y liviano, el que más se tambalea.
    wobble: { stiffness: 95, damping: 3.6, response: 0.05 },
  },
];

export function getProjectById(id: string): Project | undefined {
  return projects.find((project) => project.id === id);
}
