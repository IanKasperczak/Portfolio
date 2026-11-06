import Reveal from "@/components/ui/Reveal";
import SplitReveal from "@/components/ui/SplitReveal";
import { about } from "@/lib/about";

export default function Contact() {
  const links = about.links.filter((link) => link.href);

  return (
    <section id="contacto" className="mx-auto w-full max-w-6xl px-6 pt-16 pb-20 sm:px-10 lg:px-16">
      <div className="rounded-[2rem] bg-amber-950 px-8 py-14 text-[var(--background)] sm:px-14 sm:py-20">
        <h2 className="font-display text-[clamp(2.6rem,6vw,5rem)] leading-none">
          <SplitReveal inView text="¿Hablamos?" />
        </h2>
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-lg text-base leading-relaxed opacity-75 sm:text-lg">
            {about.contactNote}
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <a
            href={`mailto:${about.email}`}
            className="mt-10 inline-block font-display text-[clamp(1.3rem,3.2vw,2.2rem)] leading-tight break-all underline decoration-white/25 decoration-2 underline-offset-[0.2em] transition-colors duration-200 hover:decoration-[var(--background)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
          >
            {about.email}
          </a>
        </Reveal>
        <Reveal delay={0.25}>
          <ul className="mt-8 flex flex-wrap gap-3">
            {links.map((link) => {
              // El CV también se abre aparte: no saca a nadie del portfolio.
              const external = link.href.startsWith("http") || link.href.endsWith(".pdf");
              return (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-2.5 text-sm font-medium transition-colors duration-200 hover:bg-[var(--background)] hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60"
                  >
                    {link.label}
                    <span aria-hidden>↗</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>

      <p className="mt-10 text-center text-xs text-amber-900/50">
        © {new Date().getFullYear()} {about.name}
      </p>
    </section>
  );
}
