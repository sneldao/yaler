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
  const h = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');

  return (
    <div ref={ref} className="space-y-3">
      {/* Machine-voice header row, like a kitchen clock board */}
      <div className="flex items-center justify-between gap-3 font-machine text-[10px] uppercase tracking-[0.14em] text-ink-muted">
        <span>Time to an engineer booked</span>
        <span className="text-escalate">every min down ≈ £13</span>
      </div>

      {/* The service clock — big thermal digits counting to the booking.
          No paper-card wrapper: the clock IS the section. */}
      <div className="flex items-end justify-between gap-4">
        <p className="clock-digits text-6xl sm:text-7xl text-mandate" aria-hidden>
          {h}
          <span className="clock-colon">:</span>
          {mm}
        </p>
        <div className="text-right space-y-1 shrink-0 pb-1">
          <p className="font-machine text-[10px] uppercase tracking-wider text-ink-muted">The old way</p>
          <p className="font-machine text-lg text-ink-muted/70 line-through decoration-escalate/60 leading-none">
            3–4 hrs
          </p>
          <p className="hand-note" aria-hidden>↑ the phone-call afternoon</p>
        </div>
      </div>

      {/* Clock sweep — the same number as a shape, for glanceability */}
      <div className="h-1.5 rounded-full bg-paper-inset overflow-hidden" aria-hidden>
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
