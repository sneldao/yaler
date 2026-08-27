import React, { useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);
gsap.registerPlugin(useGSAP);

interface Beat {
  clock: string;
  tag: string;
  title: string;
  body: string;
}

const BEATS: Beat[] = [
  {
    clock: '06:47',
    tag: 'Cafe Noor, Dalston',
    title: 'The walk-in dies before breakfast.',
    body: "Priya hears the compressor cut out. The fridge is warming, breakfast prep is half done, and the first covers are in 13 minutes.",
  },
  {
    clock: '06:49',
    tag: 'The ask',
    title: 'Say it once.',
    body: "One voice note from the kitchen floor. It comes back as rules — fix the walk-in, up to £500, N1, sorted before lunch. Nobody has been called.",
  },
  {
    clock: '06:51',
    tag: 'The search',
    title: 'We knock on the right doors.',
    body: 'Three refrigeration engineers within a mile hear about the job. Anything out of area or over budget is never sent in the first place.',
  },
  {
    clock: '07:14',
    tag: 'The stop',
    title: 'Best quote is £80 over. We stop.',
    body: "Booking itself would be easy. Breaking Priya's ceiling isn't ours to do. The job holds at the line and waits for her yes.",
  },
  {
    clock: '09:12',
    tag: 'The receipt',
    title: 'She raised the line. Done.',
    body: "Priya came to the floor and raised the ceiling. Compressor swapped, -18C holding, done at £420 on a paper she'd be happy to show an EHO.",
  },
];

export default function HomeStory() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const fill = root.current?.querySelector('.story-rail-fill');
      const steps = root.current?.querySelector('.story-steps');
      const mm = gsap.matchMedia();

      // Reduced motion: the rail shows complete and no scroll-linked motion
      // runs. Every beat stays fully readable in the static column.
      mm.add('(prefers-reduced-motion: reduce)', () => {
        if (fill) gsap.set(fill, { scaleY: 1 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        root.current?.querySelectorAll('.story-beat').forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: 'top 62%',
            end: 'bottom 38%',
            onToggle: (self) => self.isActive && setActive(i),
          });
        });

        if (fill && steps) {
          gsap.fromTo(
            fill,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              scrollTrigger: { trigger: steps, start: 'top 60%', end: 'bottom 65%', scrub: 0.4 },
            },
          );
        }
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  const current = BEATS[active] ?? BEATS[0];

  return (
    <section ref={root} className="paper-card rounded-2xl p-5 sm:p-8" id="story">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-mandate font-medium">Last Tuesday · N1</p>
        <h2 className="font-display text-3xl sm:text-4xl text-ink tracking-tight mt-1">How last Tuesday went</h2>
        <p className="text-ink-muted text-sm sm:text-base leading-relaxed max-w-xl mt-2">
          One fridge. One kitchen. Scroll through the night exactly as it happened — nothing booked, nothing spent.
        </p>
      </div>

      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 md:gap-10">
        <div className="hidden md:block">
          <div className="sticky top-28">
            <p className="text-xs uppercase tracking-wider text-ink-muted">{current.tag}</p>
            <p className="font-display text-6xl text-ink tabular-nums mt-2" aria-live="polite">
              {current.clock}
            </p>
            <div className="h-px bg-ink/10 my-5 max-w-[12rem]" />
            <p className="font-display text-lg text-ink-muted leading-snug max-w-[14rem] italic">{current.title}</p>
          </div>
        </div>

        <div className="relative story-steps pl-7 space-y-5">
          <div className="absolute left-[6px] top-3 bottom-3 w-px bg-ink/12">
            <div className="story-rail-fill w-full h-full bg-mandate origin-top scale-y-0 rounded-full" />
          </div>

          {BEATS.map((b, i) => (
            <article
              key={b.clock}
              data-beat
              className={`story-beat relative rounded-xl border p-4 sm:p-5 transition-all duration-500 ${
                i === active
                  ? 'bg-paper-raised border-mandate/35 shadow-[0_10px_28px_-18px_rgba(18,33,43,0.28)]'
                  : 'bg-paper/60 border-ink/10 opacity-55'
              }`}
            >
              <span
                className={`absolute -left-7 top-6 w-3 h-3 -translate-x-[5px] rounded-full border-2 transition-colors duration-500 ${
                  i <= active ? 'bg-mandate border-paper' : 'bg-paper border-ink/25'
                }`}
                style={{ boxShadow: '0 0 0 2px var(--paper)' }}
                aria-hidden="true"
              />
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[11px] uppercase tracking-wider text-mandate font-medium">{b.tag}</p>
                <p className="text-xs text-ink-muted tabular-nums md:hidden">{b.clock}</p>
              </div>
              <h3 className="font-display text-xl sm:text-2xl text-ink mt-1.5 leading-snug">{b.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed mt-2">{b.body}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3 border-t border-ink/10 pt-6">
        <a href="/rehearsal" className="btn-primary text-sm py-3 px-5">
          Walk it yourself in the rehearsal
        </a>
        <p className="text-xs text-ink-muted">Same story, your hands on it. Nothing will be booked.</p>
      </div>
    </section>
  );
}
