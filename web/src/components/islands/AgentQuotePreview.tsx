import React, { useRef, useState, useEffect } from 'react';
import { formatMoney } from '../../lib/copy';

/**
 * AgentQuotePreview — the three AI supplier agent quotes as chits on a
 * ticket rail, not stacked cards.
 *
 * The ticket rail (`.ticket-rail`) is the kitchen pass: a horizontal
 * spike that chits hang from. Each chit is a punched paper ticket with
 * a slight tilt. The two-voice treatment on each chit is the brand in
 * one component: machine-printed price/availability in Space Mono (the
 * agent's voice), persona as a Caveat sharpie margin note (the human's
 * voice).
 *
 * This component renders only the chits row — the rail itself (label,
 * meta, the `.ticket-rail` wrapper) is provided by
 * `TicketRailSection.astro` at the call site. See docs/BRAND.md "Motifs
 * are sections, not ornaments."
 *
 * The data mirrors the real persona-driven output from Gemini 3.5 Flash.
 */

interface AgentQuote {
  supplierId: string;
  name: string;
  persona: string;
  tier: string;
  tierColor: string;
  price: number;
  currency: string;
  availability: string;
  terms: string;
  evidence: string[];
  highlight?: boolean;
  // A short sharpie-note persona label — the human voice on the chit.
  handNote: string;
}

const QUOTES: AgentQuote[] = [
  {
    supplierId: 'sup_rapid_coldcare',
    name: 'London Rapid ColdCare',
    persona: 'Premium emergency specialist',
    tier: 'PREMIUM',
    tierColor: 'bg-amber-500',
    price: 480,
    currency: 'GBP',
    availability: 'Today, within 2 hours',
    terms: 'Guaranteed 2-hour emergency response. Full F-Gas compliance paperwork and a 12-month parts warranty included.',
    evidence: ['F-Gas Certified', 'Refcom Registered'],
    highlight: true,
    handNote: 'the premium one',
  },
  {
    supplierId: 'sup_capital_kitchen',
    name: 'Capital Kitchen Services',
    persona: 'Mid-market generalist',
    tier: 'MODERATE',
    tierColor: 'bg-blue-500',
    price: 380,
    currency: 'GBP',
    availability: 'Tomorrow morning',
    terms: 'Standard callout fee with up to two hours of on-site diagnostics. Parts quoted transparently on-site.',
    evidence: ['Safe Contractor Approved'],
    handNote: 'solid middle ground',
  },
  {
    supplierId: 'sup_east_catering',
    name: 'East London Catering',
    persona: 'Budget direct fixer',
    tier: 'BUDGET',
    tierColor: 'bg-emerald-500',
    price: 395,
    currency: 'GBP',
    availability: 'Today, within 4 hours',
    terms: "No fancy frills or endless paperwork, just a direct, reliable fix to get your temperature back down today.",
    evidence: ['NVQ Level 3 Technicians'],
    handNote: 'no frills, just fixed',
  },
];

export default function AgentQuotePreview() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // Track which chit is centered in the mobile carousel viewport.
  // Desktop doesn't scroll (sm:overflow-visible) so this is a no-op there.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const chits = el.children;
      if (chits.length === 0) return;
      // Find the chit closest to the left edge of the viewport.
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < chits.length; i++) {
        const dist = Math.abs(chits[i].getBoundingClientRect().left - el.getBoundingClientRect().left);
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      setActiveIdx(best);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Mobile: swipeable snap-carousel — one chit at a time, 85vw each.
          Desktop (sm+): three chits across the rail, flex to fill — the
          kitchen pass with all three quotes visible for comparison. */}
      <div ref={scrollRef} className="flex gap-3 snap-row overflow-x-auto hide-scrollbar sm:overflow-visible pb-1">
        {QUOTES.map((q, i) => (
          <div
            key={q.supplierId}
            className={`chit shrink-0 w-[85vw] sm:w-auto sm:flex-1 snap-center px-4 pt-5 pb-3 space-y-3 ${q.highlight ? 'border-mandate/40' : ''}`}
            style={{ '--tilt': i % 2 === 0 ? '-1.2deg' : '0.8deg' } as React.CSSProperties}
          >
          {/* Tier bar — colored left edge so the three agents feel visually distinct at a glance */}
          <div className={`absolute left-0 top-0 bottom-0 w-1 ${q.tierColor}`} aria-hidden />

          {/* Header: agent name + machine-voice price */}
          <div className="flex items-start justify-between gap-2 pl-1.5">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-mandate mb-0.5 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-mandate" />
                AI agent quote
              </p>
              <p className="font-medium text-ink text-sm leading-tight">{q.name}</p>
            </div>
            <p className="font-machine text-xl tabular-nums text-ink shrink-0 leading-none">
              {formatMoney(q.price, q.currency)}
            </p>
          </div>

          {/* The human voice — a sharpie margin note for the persona */}
          <p className="hand-note pl-1.5 -my-1" aria-hidden>
            {q.handNote}
          </p>
          <p className="sr-only">{q.persona}</p>

          {/* Availability — machine voice */}
          <p className="font-machine text-[10px] uppercase tracking-wider text-ink-muted pl-1.5">
            {q.availability}
          </p>

          {/* Terms — the agent's reasoning, separated by a tear perforation */}
          <div className="chit-tear pt-2.5 pl-1.5">
            <p className="text-xs text-ink-muted leading-relaxed">{q.terms}</p>
          </div>

          {/* Evidence badges */}
          <div className="flex flex-wrap gap-1.5 pl-1.5">
            {q.evidence.map((ev) => (
              <span
                key={ev}
                className="text-[9px] px-1.5 py-0.5 rounded-full bg-mandate/10 text-mandate border border-mandate/20 font-medium"
              >
                {ev}
              </span>
            ))}
          </div>
        </div>
      ))}
      </div>

      {/* Mobile carousel dots — shows which chit you're on.
          Hidden on desktop where all three are visible. */}
      <div className="flex justify-center gap-1.5 mt-2 sm:hidden" aria-hidden>
        {QUOTES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === activeIdx ? 'w-4 bg-mandate' : 'w-1.5 bg-ink/15'
            }`}
          />
        ))}
      </div>
    </>
  );
}
