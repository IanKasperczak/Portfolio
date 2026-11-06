/**
 * Contenido de "Sobre mí" y contacto.
 */

export type AboutFact = { label: string; value: string; href?: string };
export type StackGroup = { label: string; items: string[] };
export type ContactLink = { label: string; href: string };

export const about = {
  name: "Ian Kasperczak",
  /** Título del hero, una línea por elemento. */
  greeting: ["Hola,", "soy Ian."],

  /** Rotan en el hero, después de "Desarrollo…". Salen de los proyectos del cuarto. */
  roles: ["herramientas con IA", "bots de automatización", "aplicaciones web"],

  bio: [
    "Estoy en cuarto año de Ingeniería en Sistemas de la Información en la UTN Rosario. Lo que más me gusta es construir cosas a medida con IA: herramientas que resuelvan un problema concreto y que además den gusto usar.",
    "Cada proyecto lo tomo como una prueba: llevar lo que veo en las cátedras, como análisis de sistemas, bases de datos o arquitectura, a algo que funcione de verdad, y acercarme lo más posible a un acabado profesional. Me importa tanto que haga lo que tiene que hacer como que se vea bien. La IA es parte de mi forma de trabajar: me deja avanzar rápido, pero leo y entiendo todo lo que entra al código.",
    "Con amigos de la facultad armamos Lince, donde hacemos webs y automatizaciones para negocios. Ahora busco mi primer trabajo estable como desarrollador, en un equipo donde pueda seguir creciendo como ingeniero.",
  ],

  facts: [
    { label: "Estudio", value: "Ing. en Sistemas · UTN FRRo" },
    { label: "Cursando", value: "4.º año" },
    { label: "Desde", value: "Rosario, Santa Fe" },
    { label: "Ahora mismo", value: "Construyendo Lince", href: "https://lince-automate.com.ar" },
    { label: "Fuera del código", value: "Dibujo y diseño. Los pósters del cuarto son míos" },
    { label: "Idiomas", value: "Español nativo · Inglés B2" },
  ] satisfies AboutFact[],

  /** Lo que usó en proyectos y en la facultad (sale del CV). */
  stack: [
    { label: "Lenguajes", items: ["TypeScript", "JavaScript", "Python", "C"] },
    { label: "Frontend", items: ["React", "Next.js", "Tailwind CSS", "Vite", "Material UI"] },
    { label: "Backend", items: ["Node.js", "Express", "FastAPI", "APIs REST", "RAG"] },
    { label: "Datos", items: ["PostgreSQL", "Sequelize", "Supabase"] },
    { label: "Herramientas", items: ["Git", "GitHub", "Vercel", "Vitest", "Jest"] },
  ] satisfies StackGroup[],

  /** Bajada de la sección de contacto. */
  contactNote:
    "Estoy buscando mi primer trabajo como desarrollador. Si tenés una propuesta, una pregunta sobre algún proyecto o simplemente querés charlar, escribime.",

  email: "iankasperczak@gmail.com",

  /** Los que tienen href vacío no se muestran. */
  links: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/ian-kasperczak/" },
    { label: "GitHub", href: "https://github.com/IanKasperczak" },
    { label: "CV (PDF)", href: "/cv/Ian-Kasperczak-CV.pdf" },
  ] satisfies ContactLink[],
};
