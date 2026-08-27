import React, { useState } from 'react';

/**
 * StoryTeaser — the Cafe Noor story as one headline, not three lines.
 * The card is tappable: the excerpt expands inline (not on scroll), and the
 * full story link appears in the expanded state. Collapsed cost: one card,
 * one headline, zero body text.
 */
export default function StoryTeaser() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`paper-card rounded-2xl transition-colors ${expanded ? 'border-mandate/30' : 'paper-card-hover'}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="w-full text-left p-5 space-y-2 block"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-[0.14em] text-mandate font-medium">Cafe Noor, Dalston</p>
          <span className="text-xs text-ink-muted shrink-0">{expanded ? 'Less ↑' : 'Read the story →'}</span>
        </div>
        <p className="font-display text-xl text-ink">Fridge died at 6:47am. Fixed by 9:12.</p>
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
          <div className="px-5 pb-5 space-y-3">
            <p className="text-sm text-ink-muted leading-relaxed">
              One voice note. Three quotes. A policy stop. A receipt on the wall.
            </p>
            <a href="/story" className="text-sm text-mandate hover:text-ink transition-colors inline-block">
              Read the full story →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
