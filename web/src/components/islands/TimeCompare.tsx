import React, { useEffect, useRef, useState } from 'react';

/**
 * TimeCompare — the before/after as ONE visual moment, not two cards.
 *
 * The hero number animates from the "before" (225 min — a phone-call
 * afternoon) down to the "after" (15 min) when scrolled into view, with the
 * old number sitting beside it as muted strikethrough. No prose paragraphs —
 * the numbers speak for themselves. Reduced-motion users get the final state
 * instantly. Plain rAF + IntersectionObserver: no animation library lands in
 * the home bundle.
 */

const BEFORE_MIN = 225; // 3–4 hours of calls
const AFTER_MIN = 15;
const DURATION_MS = 1400;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export default function TimeCompare() {
  const ref = useRef<HTMLDivElement>(null);
  const [minutes, setMinutes] = useState(BEFORE_MIN);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setMinutes(AFTER_MIN);
      setStarted(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMinutes(AFTER_MIN);
      return;
    }
    let raf: number;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION_MS);
      setMinutes(Math.round(BEFORE_MIN - (BEFORE_MIN - AFTER_MIN) * easeOutCubic(t)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started]);

  const done = minutes === AFTER_MIN;

  return (
    <div ref={ref} className="paper-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">Time to an engineer booked</p>
          <p className="font-display text-4xl sm:text-5xl text-mandate tabular-nums leading-none">
            ~{minutes} <span className="text-xl sm:text-2xl">min</span>
          </p>
        </div>
        <div className="text-right space-y-1 shrink-0">
          <p className="text-[10px] uppercase tracking-wider text-ink-muted">The old way</p>
          <p className="font-display text-xl sm:text-2xl text-ink-muted/70 line-through decoration-escalate/60 leading-none">
            3–4 hrs
          </p>
        </div>
      </div>
      {/* Progress bar — the same number as a shape, for glanceability */}
      <div className="mt-4 h-1.5 rounded-full bg-paper-inset overflow-hidden" aria-hidden>
        <div
          className={`h-full rounded-full bg-mandate ${done ? '' : 'transition-none'}`}
          style={{
            width: `${(minutes / BEFORE_MIN) * 100}%`,
            transition: done ? undefined : 'width 100ms linear',
          }}
        />
      </div>
      <p className="sr-only">
        With Yaler an engineer is booked in about 15 minutes, compared to 3 to 4 hours of phone calls.
      </p>
    </div>
  );
}
