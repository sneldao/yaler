import React, { useEffect, useRef, useState } from 'react';

/**
 * StepsCarousel — the 3-step explainer as a progressive-disclosure pattern.
 *
 * Mobile: horizontal CSS scroll-snap carousel — one card in focus, a peek of
 * the next inviting a swipe (the Revolut/Bumble onboarding pattern).
 * Desktop: the original 3-column grid.
 *
 * Each card shows number + title + one short line; the full explanation is
 * tap-to-expand, so a collapsed card costs one viewport line, not three.
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
      className={`paper-card rounded-xl p-5 space-y-2 shrink-0 w-[82%] sm:w-auto transition-colors ${
        expanded ? 'border-mandate/30' : ''
      }`}
    >
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mandate/10 text-mandate text-xs font-bold">
        {index + 1}
      </span>
      <p className="text-ink font-medium">{step.title}</p>
      <p className="text-sm text-ink-muted leading-relaxed">{step.short}</p>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="text-[11px] text-mandate hover:text-ink transition-colors"
      >
        {expanded ? 'Less' : 'How it works'}
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
          <p className="text-xs text-ink-muted leading-relaxed pt-1 border-t border-ink/5">{step.body}</p>
        </div>
      </div>
    </div>
  );
}

export default function StepsCarousel() {
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Track which card is centred for the dot indicators (mobile only).
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
    <div className="space-y-3">
      <div
        ref={rowRef}
        className="snap-row hide-scrollbar flex gap-3 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible"
        role="list"
        aria-label="How it works — three steps"
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
