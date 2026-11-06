import Reveal from "@/components/ui/Reveal";
import SplitReveal from "@/components/ui/SplitReveal";
import TechBadge from "@/components/ui/TechBadge";
import { about } from "@/lib/about";

const eyebrow = "text-xs font-medium tracking-[0.2em] text-amber-900/55 uppercase";

export default function About() {
  return (
    <section
      id="sobre-mi"
      className="mx-auto w-full max-w-6xl scroll-mt-8 px-6 py-24 sm:px-10 sm:py-32 lg:px-16"
    >
      <div className="grid gap-14 lg:grid-cols-[1.25fr_1fr] lg:gap-20">
        <div>
          <h2 className="font-display text-[clamp(2.2rem,4.4vw,3.6rem)] leading-none text-amber-950">
            <SplitReveal inView text="Sobre mí" />
          </h2>
          {about.bio.map((paragraph, i) => (
            <Reveal key={paragraph} delay={0.15 + i * 0.08}>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-amber-950/75 sm:text-lg">
                {paragraph}
              </p>
            </Reveal>
          ))}
        </div>

        <div className="lg:pt-3">
          <Reveal delay={0.2}>
            <dl className="divide-y divide-amber-900/10 border-y border-amber-900/10">
              {about.facts.map((fact) => (
                <div key={fact.label} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className={`shrink-0 ${eyebrow}`}>{fact.label}</dt>
                  <dd className="text-right text-sm text-pretty text-amber-950 sm:text-base">
                    {fact.href ? (
                      <a
                        href={fact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-amber-900/30 underline-offset-4 transition-colors duration-200 hover:decoration-amber-900"
                      >
                        {fact.value}
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={0.3}>
            <p className={`mt-10 ${eyebrow}`}>Con qué trabajo</p>
            <div className="mt-4 space-y-3.5">
              {about.stack.map((group) => (
                <div key={group.label} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-3">
                  <span className="text-xs text-amber-900/55">{group.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((tech) => (
                      <TechBadge key={tech} label={tech} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
