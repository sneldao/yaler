import React, { useEffect, useRef, useState } from 'react';

/**
 * StepsCarousel — the 3-step explainer as chits on the kitchen ticket rail.
 *
 * Each step hangs from a brushed-metal rail as a punched paper chit with a
 * slight tilt, like a ticket just spiked. Mobile: horizontal scroll-snap
 * (chits slide along the rail). Desktop: 3-column grid under one rail.
 * Tap a chit to expand the fuller explanation.
 */

const STEPS = [
  {
    title: "Say what's broken",
    short: 'Voice or text — ten seconds.',
    body: 'Voice or text. AI extracts the budget, deadline, area, and category into a structured mandate you approve.',
  },
  {
    title: 'Agent works within your rules',
    short: 'Sources, ranks, books — inside budget.',
    body: 'Sources engineers, collects quotes, ranks them. The policy engine enforces your budget and area. It stops if anything goes over.',
  },
  {
    title: 'Receipt on the wall',
    short: 'Photo-verified, shareable proof.',
    body: 'The engineer submits photo evidence. AI verifies the work. You get a shareable proof receipt.',
  },
];

// Slight alternating tilt so chits read as hand-spiked, not rendered.
const TILTS = ['-1.4deg', '1deg', '-0.8deg'];

function StepCard({
  step,
  index,
  expanded,
  onToggle,
}: {
  step: (typeof STEPS)[number];
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`chit shrink-0 w-[82%] sm:w-auto pt-6 pb-4 px-4 space-y-2 ${
        expanded ? 'border-mandate/40' : ''
      }`}
      style={{ '--tilt': TILTS[index % TILTS.length] } as React.CSSProperties}
    >
      <div className="flex items-baseline justify-between">
        <span className="font-machine text-sm font-bold text-mandate">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-machine text-[9px] uppercase tracking-[0.12em] text-ink-muted">
          spike
        </span>
      </div>
      <p className="text-ink font-medium">{step.title}</p>
      <p className="text-sm text-ink-muted leading-relaxed">{step.short}</p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="font-machine text-[11px] text-mandate hover:text-ink transition-colors"
      >
        {expanded ? '— less' : '+ how it works'}
      </button>
      <div
        className="grid transition-[grid-template-rows,opacity] duration-200"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'var(--ease)',
        }}
      >
        <div className="overflow-hidden">
          <p className="text-xs text-ink-muted leading-relaxed pt-2 mt-1 chit-tear">{step.body}</p>
        </div>
      </div>
    </div>
  );
}

export default function StepsCarousel() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Track which chit is centred for the dot indicators (mobile only).
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const onScroll = () => {
      const cards = Array.from(row.children) as HTMLElement[];
      const centre = row.scrollLeft + row.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const cardCentre = card.offsetLeft + card.offsetWidth / 2;
        const dist = Math.abs(cardCentre - centre);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive(best);
    };
    row.addEventListener('scroll', onScroll, { passive: true });
    return () => row.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="space-y-3 overflow-hidden">
      <div className="ticket-rail">
        <div
          ref={rowRef}
          className="snap-row hide-scrollbar flex gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible"
          role="list"
          aria-label="How it works — three steps on the rail"
        >
          {STEPS.map((step, i) => (
            <StepCard
              key={step.title}
              step={step}
              index={i}
              expanded={expanded === i}
              onToggle={() => setExpanded((cur) => (cur === i ? null : i))}
            />
          ))}
        </div>
      </div>

      {/* Position dots — mobile only, the grid shows everything on desktop */}
      <div className="flex justify-center gap-1.5 sm:hidden" aria-hidden>
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === active ? 'w-4 bg-mandate' : 'w-1.5 bg-ink/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
