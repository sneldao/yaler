import React, { useEffect, useRef, useState } from 'react';

/**
 * HeroStepFlow — the hero subhead as a kinetic process flow.
 *
 * Four steps that light up in sequence when scrolled into view:
 *   mic → 3 agents → wrench → receipt
 *
 * Replaces the paragraph "Voice in. Three AI supplier agents quote.
 * Engineer booked. Receipt on the wall. Autonomously." with a visual
 * that communicates the same flow without reading. Reduced-motion
 * users get all steps lit immediately.
 */

interface Step {
  label: string;
  icon: React.ReactNode;
}

const STEPS: Step[] = [
  {
    label: 'Voice in',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    ),
  },
  {
    label: '3 agents quote',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="5" cy="8" r="2" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="19" cy="8" r="2" />
        <path d="M3 14h4M9 12h6M17 14h4" />
      </svg>
    ),
  },
  {
    label: 'Engineer booked',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    label: 'Receipt on the wall',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z" />
        <path d="M8 7h8M8 11h8M8 15h5" />
      </svg>
    ),
  },
];

export default function HeroStepFlow() {
  const ref = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setActiveStep(STEPS.length - 1);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Sequence through steps with a stagger
          STEPS.forEach((_, i) => {
            setTimeout(() => setActiveStep(i), i * 350);
          });
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex items-center gap-1 sm:gap-2 flex-wrap" aria-label="How a job flows: voice in, three agents quote, engineer booked, receipt on the wall">
      {STEPS.map((step, i) => {
        const lit = i <= activeStep;
        const isLast = i === STEPS.length - 1;
        return (
          <React.Fragment key={step.label}>
            <div
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 transition-all duration-300 ${
                lit
                  ? 'border-mandate/30 bg-mandate/8 text-ink'
                  : 'border-ink/10 bg-paper-inset text-ink-muted/50'
              }`}
              style={{
                opacity: lit ? 1 : 0.4,
                transform: lit ? 'translateY(0)' : 'translateY(2px)',
              }}
            >
              <span className={lit ? 'text-mandate' : 'text-ink-muted/40'}>
                {step.icon}
              </span>
              <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
            </div>
            {!isLast && (
              <span
                className={`text-sm transition-colors duration-300 ${lit ? 'text-mandate' : 'text-ink-muted/30'}`}
                aria-hidden
              >
                →
              </span>
            )}
          </React.Fragment>
        );
      })}
      <span className="sr-only">Autonomously.</span>
    </div>
  );
}
