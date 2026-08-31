import React, { useEffect, useRef, useState } from 'react';
import { SponsorMark, type SponsorId } from '../primitives/SponsorCallout';

/**
 * SponsorChips — the "what fires on every job" strip as one horizontal row
 * of pills, not a grid of cards. One line of chips on screen; tapping a chip
 * opens a bottom sheet with the full description and the rehearsal CTA.
 * ~80% less vertical space than the card grid.
 */

interface Chip {
  id: SponsorId;
  name: string;
  descriptor: string;
  detail: string;
  color: string;
}

const CHIPS: Chip[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    descriptor: 'Mandate',
    detail: 'Extracts your mandate from a voice note. Ranks the quotes. Verifies the evidence photos.',
    color: 'text-blue-600',
  },
  {
    id: 'vapi',
    name: 'Vapi',
    descriptor: 'Voice',
    detail: "Voice-first input. Say what's broken — no typing required.",
    color: 'text-purple-600',
  },
  {
    id: 'exa',
    name: 'Exa',
    descriptor: 'Search',
    detail: 'Searches the web for real local engineers matching the job.',
    color: 'text-emerald-600',
  },
  {
    id: 'apify',
    name: 'Apify',
    descriptor: 'Verify',
    detail: 'Scrapes Companies House to check each business is actually registered.',
    color: 'text-orange-600',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    descriptor: 'Audio',
    detail: 'Reads your receipt aloud — audio proof you can play back.',
    color: 'text-pink-600',
  },
];

export default function SponsorChips() {
  const [open, setOpen] = useState<Chip | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Bottom-sheet behaviour: Esc closes, focus moves in on open and back on close.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const trigger = triggerRef.current;
      if (trigger && document.contains(trigger)) trigger.focus();
      triggerRef.current = null;
    };
  }, [open]);

  return (
    <>
      <div
        className="hide-scrollbar flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap"
        role="list"
        aria-label="The five services that fire on every job"
      >
        {CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="listitem"
            onClick={() => setOpen(chip)}
            aria-haspopup="dialog"
            className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper-raised px-3 py-1.5 text-xs transition-colors hover:border-ink/25"
          >
            <span className={chip.color}>
              <SponsorMark id={chip.id} className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium text-ink">{chip.name}</span>
            <span className="text-ink-muted">· {chip.descriptor}</span>
          </button>
        ))}
      </div>

      {/* Bottom sheet — depth on demand */}
      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-ink/40 animate-pop-in"
          onClick={() => setOpen(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${open.name} — what it does on a job`}
            className="paper-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 space-y-3 animate-fade-up safe-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={open.color}>
                  <SponsorMark id={open.id} className="w-4 h-4" />
                </span>
                <p className="font-medium text-ink">{open.name}</p>
                <span className="text-[11px] text-ink-muted">· {open.descriptor}</span>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="w-11 h-11 inline-flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-paper-inset transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed">{open.detail}</p>
            <a href="/rehearsal" className="btn-secondary text-sm py-2.5 w-full inline-flex justify-center">
              See all five fire on a real job →
            </a>
          </div>
        </div>
      )}
    </>
  );
}
