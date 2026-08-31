import React, { useState, useEffect, useRef } from 'react';

/**
 * HomeStory — the Cafe Noor Tuesday-morning story as a horizontal stepper.
 *
 * Five clock times as split-flap board tiles across the top; one beat's
 * content visible below. Click a time to flip to that beat. The clocks
 * ARE the navigation — this is the split-flap motif as a section primitive,
 * not a scroll-driven card deck.
 *
 * Replaces the previous GSAP ScrollTrigger vertical timeline, which
 * elongated the page with five stacked article cards. This is ~70%
 * shorter vertically and interactive instead of passive.
 */

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
    body: 'Three AI supplier agents within a mile hear about the job. Each reasons independently about the callout, budget, and deadline — then quotes in its own voice. Anything out of area or over budget is never sent in the first place.',
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
  const [active, setActive] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const sectionRef = useRef<HTMLElement>(null);

  // Auto-advance through beats when the section is in view, like a
  // split-flap board flipping through the morning. Pauses on hover/focus
  // and when the user manually selects a beat.
  useEffect(() => {
    if (!autoAdvance) return;
    const section = sectionRef.current;
    if (!section) return;

    let inView = false;
    const observer = new IntersectionObserver(
      ([entry]) => { inView = entry.isIntersecting; },
      { threshold: 0.4 },
    );
    observer.observe(section);

    const interval = setInterval(() => {
      if (!inView) return;
      setActive((prev) => (prev + 1) % BEATS.length);
    }, 4000);

    return () => { observer.disconnect(); clearInterval(interval); };
  }, [autoAdvance]);

  // Re-enable auto-advance after a period of inactivity following a
  // manual selection, so the board resumes flipping on its own.
  const manualSelect = (i: number) => {
    setActive(i);
    setAutoAdvance(false);
  };

  const current = BEATS[active] ?? BEATS[0];

  return (
    <section
      ref={sectionRef}
      className="space-y-5"
      id="story"
      onMouseLeave={() => { /* resume auto-advance after leaving the section */ }}
    >
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-mandate font-medium">Last Tuesday · N1</p>
        <h2 className="font-display text-3xl sm:text-4xl text-ink tracking-tight mt-1">How last Tuesday went</h2>
        <p className="text-ink-muted text-sm sm:text-base leading-relaxed max-w-xl mt-2">
          One fridge. One kitchen. Step through the morning as it happened — nothing booked, nothing spent.
        </p>
      </div>

      {/* The split-flap clock board — 5 times as flip tiles.
          Click a time to jump to that beat. The connecting line shows
          progression through the morning. */}
      <div className="relative">
        {/* Progress line behind the tiles */}
        <div className="absolute top-[18px] left-0 right-0 h-px bg-ink/10" aria-hidden />
        <div
          className="absolute top-[18px] left-0 h-px bg-mandate transition-all duration-500"
          style={{ width: `${(active / (BEATS.length - 1)) * 100}%` }}
          aria-hidden
        />

        <div className="relative flex justify-between gap-1">
          {BEATS.map((b, i) => {
            const state = i < active ? 'done' : i === active ? 'active' : 'future';
            return (
              <button
                key={b.clock}
                type="button"
                onClick={() => manualSelect(i)}
                onMouseEnter={() => setAutoAdvance(false)}
                aria-label={`${b.tag} at ${b.clock}`}
                aria-pressed={i === active}
                className="group flex flex-col items-center gap-1.5 shrink-0"
              >
                <span
                  className={[
                    'flex items-center justify-center w-9 h-9 rounded-lg border-2 font-machine text-[11px] tabular-nums transition-all duration-300',
                    state === 'active'
                      ? 'border-mandate bg-mandate text-paper scale-110 shadow-[0_4px_14px_-4px_rgba(18,33,43,0.3)]'
                      : state === 'done'
                        ? 'border-mandate/40 bg-mandate/10 text-mandate'
                        : 'border-ink/15 bg-paper text-ink-muted group-hover:border-ink/30',
                  ].join(' ')}
                >
                  {state === 'done' ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" aria-hidden>
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    b.clock
                  )}
                </span>
                <span
                  className={[
                    'text-[9px] uppercase tracking-wider transition-colors duration-300 hidden sm:block',
                    state === 'active' ? 'text-mandate font-medium' : 'text-ink-muted',
                  ].join(' ')}
                >
                  {b.tag.split(',')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The active beat — one content panel, not five stacked cards.
          Fades in on beat change for a flip-board feel. */}
      <div
        key={active}
        className="animate-fade-up rounded-xl border border-mandate/20 bg-paper-raised p-5 sm:p-6 shadow-[0_10px_28px_-18px_rgba(18,33,43,0.18)]"
      >
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-[11px] uppercase tracking-wider text-mandate font-medium">{current.tag}</p>
          <p className="font-machine text-sm text-ink-muted tabular-nums">{current.clock}</p>
        </div>
        <h3 className="font-display text-xl sm:text-2xl text-ink leading-snug">{current.title}</h3>
        <p className="text-sm text-ink-muted leading-relaxed mt-2">{current.body}</p>
      </div>

      {/* Beat indicators — dots for mobile where the tag labels are hidden */}
      <div className="flex justify-center gap-1.5 sm:hidden" aria-hidden>
        {BEATS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === active ? 'w-4 bg-mandate' : 'w-1.5 bg-ink/15'
            }`}
          />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-t border-ink/10 pt-5">
        <a href="/rehearsal" className="btn-primary text-sm py-3 px-5">
          Walk it yourself in the rehearsal
        </a>
        <p className="text-xs text-ink-muted">Same story, your hands on it. Nothing will be booked.</p>
      </div>
    </section>
  );
}
